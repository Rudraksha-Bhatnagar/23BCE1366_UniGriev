const { body, validationResult } = require('express-validator');
const Grievance = require('../models/Grievance');
const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');
const { createNotification, notifyStatusChange } = require('../services/notificationService');

const PENDING_STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress'];
const VALID_STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress', 'Resolved', 'Closed', 'Escalated'];

const createGrievanceValidation = [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High', 'Critical'])
        .withMessage('Invalid priority'),
];

const createGrievance = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { title, description, category, priority } = req.body;

    const categoryDoc = await Category.findById(category).populate('departmentId');
    if (!categoryDoc) {
        return res.status(400).json({ message: 'Invalid category' });
    }

    let grievanceId = Grievance.generateGrievanceId();
    while (await Grievance.findOne({ grievanceId })) {
        grievanceId = Grievance.generateGrievanceId();
    }

    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + categoryDoc.slaDays);

    const attachments = (req.files || []).map((file) => ({
        filename: file.originalname,
        path: `/uploads/${file.filename}`,
        uploadedAt: new Date(),
    }));

    const grievance = await Grievance.create({
        grievanceId,
        title,
        description,
        category: categoryDoc._id,
        priority: priority || 'Medium',
        status: 'Submitted',
        assignedDepartment: categoryDoc.departmentId._id,
        submittedBy: req.user._id,
        slaDeadline,
        attachments,
        statusHistory: [
            {
                status: 'Submitted',
                changedBy: req.user._id,
                note: 'Grievance submitted',
            },
        ],
    });

    res.status(201).json({
        message: 'Grievance submitted successfully',
        grievance: {
            grievanceId: grievance.grievanceId,
            title: grievance.title,
            status: grievance.status,
            priority: grievance.priority,
            assignedDepartment: categoryDoc.departmentId.name,
            slaDeadline: grievance.slaDeadline,
            createdAt: grievance.createdAt,
        },
    });
});

const getGrievances = asyncHandler(async (req, res) => {
    const { role, _id: userId, departmentId } = req.user;
    const { status, priority, page = 1, limit = 20 } = req.query;

    let filter = {};

    if (role === 'citizen') {
        filter.submittedBy = userId;
    } else if (role === 'officer') {
        if (departmentId) {
            filter.$or = [
                { assignedOfficer: userId },
                { assignedDepartment: departmentId, assignedOfficer: null },
            ];
        } else {
            filter.assignedOfficer = userId;
        }
    } else if (role === 'deptAdmin') {
        if (departmentId) {
            filter.assignedDepartment = departmentId;
        }
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [grievances, total] = await Promise.all([
        Grievance.find(filter)
            .populate('category', 'name')
            .populate('assignedDepartment', 'name')
            .populate('assignedOfficer', 'name email')
            .populate('submittedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Grievance.countDocuments(filter),
    ]);

    res.json({
        grievances,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        },
    });
});

const getGrievanceById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    let grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    })
        .populate('category', 'name slaDays')
        .populate('assignedDepartment', 'name contactEmail')
        .populate('assignedOfficer', 'name email')
        .populate('submittedBy', 'name email')
        .populate('statusHistory.changedBy', 'name role');

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    if (
        req.user.role === 'citizen' &&
        grievance.submittedBy._id.toString() !== req.user._id.toString()
    ) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const result = grievance.toObject();
    if (req.user.role === 'citizen') {
        delete result.remarks;
    }

    res.json({ grievance: result });
});

const updateGrievanceStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    });

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    grievance._statusChangedBy = req.user._id;
    grievance._statusNote = note || `Status changed to ${status}`;
    grievance.status = status;

    await grievance.save();

    // Notify the submitter
    await notifyStatusChange(grievance);

    res.json({
        message: `Status updated to '${status}'`,
        grievance: {
            grievanceId: grievance.grievanceId,
            status: grievance.status,
            statusHistory: grievance.statusHistory,
        },
    });
});

const assignOfficer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { officerId } = req.body;

    if (!officerId) {
        return res.status(400).json({ message: 'officerId is required' });
    }

    const User = require('../models/User');
    const officer = await User.findById(officerId);
    if (!officer || !['officer', 'deptAdmin'].includes(officer.role)) {
        return res.status(400).json({ message: 'Invalid officer — user not found or not an officer' });
    }

    const grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    });

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    grievance.assignedOfficer = officerId;

    if (grievance.status === 'Submitted') {
        grievance._statusChangedBy = req.user._id;
        grievance._statusNote = `Assigned to officer: ${officer.name}`;
        grievance.status = 'In Review';
    }

    await grievance.save();

    // Notify the assigned officer
    await createNotification(
        officerId,
        `Grievance ${grievance.grievanceId} has been assigned to you.`,
        grievance._id,
        grievance.grievanceId,
        'assignment'
    );

    res.json({
        message: `Grievance assigned to ${officer.name}`,
        grievance: {
            grievanceId: grievance.grievanceId,
            assignedOfficer: { _id: officer._id, name: officer.name, email: officer.email },
            status: grievance.status,
        },
    });
});

const addRemark = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ message: 'Remark text is required' });
    }

    const grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    });

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    grievance.remarks.push({
        officerId: req.user._id,
        text: text.trim(),
    });

    await grievance.save();

    res.json({
        message: 'Remark added',
        remarks: grievance.remarks,
    });
});

const submitFeedback = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, comments } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    });

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    if (grievance.submittedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the submitter can provide feedback' });
    }

    if (!['Resolved', 'Closed'].includes(grievance.status)) {
        return res.status(400).json({ message: 'Feedback can only be submitted for resolved or closed grievances' });
    }

    if (grievance.feedback && grievance.feedback.rating) {
        return res.status(400).json({ message: 'Feedback has already been submitted for this grievance' });
    }

    grievance.feedback = {
        rating: parseInt(rating),
        comments: comments || '',
        submittedAt: new Date(),
    };

    await grievance.save();

    res.json({
        message: 'Feedback submitted successfully',
        feedback: grievance.feedback,
    });
});

const forwardGrievance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetDepartmentId, transferNote } = req.body;

    if (!targetDepartmentId || !transferNote || !transferNote.trim()) {
        return res.status(400).json({ message: 'targetDepartmentId and transferNote are required' });
    }

    const Department = require('../models/Department');
    const targetDept = await Department.findById(targetDepartmentId);
    if (!targetDept) {
        return res.status(400).json({ message: 'Target department not found' });
    }

    const grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    });

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    grievance.assignedDepartment = targetDepartmentId;
    grievance.assignedOfficer = null;
    grievance._statusChangedBy = req.user._id;
    grievance._statusNote = `Forwarded to ${targetDept.name}: ${transferNote.trim()}`;
    grievance.status = 'In Review';

    await grievance.save();

    // Notify submitter
    await createNotification(
        grievance.submittedBy,
        `Your grievance ${grievance.grievanceId} has been forwarded to ${targetDept.name}.`,
        grievance._id,
        grievance.grievanceId,
        'forward'
    );

    res.json({
        message: `Grievance forwarded to ${targetDept.name}`,
        grievance: {
            grievanceId: grievance.grievanceId,
            assignedDepartment: { _id: targetDept._id, name: targetDept.name },
            status: grievance.status,
        },
    });
});

const escalateGrievance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    }).populate('assignedDepartment', 'name');

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    // Citizens can only escalate their own grievances
    if (req.user.role === 'citizen' && grievance.submittedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
    }

    if (!PENDING_STATUSES.includes(grievance.status)) {
        return res.status(400).json({ message: 'Grievance can only be escalated when it is in a pending status' });
    }

    grievance._statusChangedBy = req.user._id;
    grievance._statusNote = reason ? `Escalated by citizen: ${reason}` : 'Escalated by citizen request';
    grievance.status = 'Escalated';

    await grievance.save();

    // Notify submitter
    await createNotification(
        grievance.submittedBy,
        `Your grievance ${grievance.grievanceId} has been escalated.`,
        grievance._id,
        grievance.grievanceId,
        'escalation'
    );

    // Notify relevant admins in the assigned department using User model
    const User = require('../models/User');
    if (grievance.assignedDepartment) {
        const deptAdmins = await User.find({
            role: { $in: ['deptAdmin', 'sysAdmin'] },
            departmentId: grievance.assignedDepartment._id || grievance.assignedDepartment,
            isActive: true,
        });

        for (const admin of deptAdmins) {
            await createNotification(
                admin._id,
                `Grievance ${grievance.grievanceId} has been escalated by the citizen.`,
                grievance._id,
                grievance.grievanceId,
                'escalation'
            );
        }
    }

    res.json({
        message: 'Grievance escalated successfully',
        grievance: {
            grievanceId: grievance.grievanceId,
            status: grievance.status,
            statusHistory: grievance.statusHistory,
        },
    });
});

const reassignDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { departmentId, reason } = req.body;

    if (!departmentId) {
        return res.status(400).json({ message: 'departmentId is required' });
    }

    const Department = require('../models/Department');
    const dept = await Department.findById(departmentId);
    if (!dept) {
        return res.status(400).json({ message: 'Department not found' });
    }

    const grievance = await Grievance.findOne({
        $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
            { grievanceId: id },
        ].filter(Boolean),
    }).populate('assignedDepartment', 'name');

    if (!grievance) {
        return res.status(404).json({ message: 'Grievance not found' });
    }

    const prevDeptName = grievance.assignedDepartment?.name || 'Unassigned';
    const note = reason
        ? `Dept reassigned by admin: ${prevDeptName} → ${dept.name}. Reason: ${reason}`
        : `Dept reassigned by admin: ${prevDeptName} → ${dept.name}`;

    grievance.assignedDepartment = departmentId;
    grievance.assignedOfficer = null;

    // Log to history without changing status (hook only fires on status change)
    grievance.statusHistory.push({
        status: grievance.status,
        changedBy: req.user._id,
        note,
    });

    await grievance.save();

    await createNotification(
        grievance.submittedBy,
        `Your grievance ${grievance.grievanceId} has been reassigned to ${dept.name} by an administrator.`,
        grievance._id,
        grievance.grievanceId,
        'forward'
    );

    res.json({
        message: `Grievance reassigned to ${dept.name}`,
        grievance: {
            grievanceId: grievance.grievanceId,
            assignedDepartment: { _id: dept._id, name: dept.name },
            assignedOfficer: null,
            status: grievance.status,
        },
    });
});

module.exports = {
    createGrievance,
    getGrievances,
    getGrievanceById,
    createGrievanceValidation,
    updateGrievanceStatus,
    assignOfficer,
    addRemark,
    submitFeedback,
    forwardGrievance,
    escalateGrievance,
    reassignDepartment,
};
