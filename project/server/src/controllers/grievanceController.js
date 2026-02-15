const { body, validationResult } = require('express-validator');
const Grievance = require('../models/Grievance');
const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Validation rules ─────────────────────────────────────────────
const createGrievanceValidation = [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High', 'Critical'])
        .withMessage('Invalid priority'),
];

/**
 * POST /api/grievances
 * Submit a new grievance (citizen)
 */
const createGrievance = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { title, description, category, priority } = req.body;

    // Look up category to get department for auto-routing
    const categoryDoc = await Category.findById(category).populate('departmentId');
    if (!categoryDoc) {
        return res.status(400).json({ message: 'Invalid category' });
    }

    // Generate unique grievance ID
    let grievanceId = Grievance.generateGrievanceId();
    // Ensure uniqueness (very rare collision)
    while (await Grievance.findOne({ grievanceId })) {
        grievanceId = Grievance.generateGrievanceId();
    }

    // Calculate SLA deadline
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + categoryDoc.slaDays);

    // Process uploaded files
    const attachments = (req.files || []).map((file) => ({
        filename: file.originalname,
        path: `/uploads/${file.filename}`,
        uploadedAt: new Date(),
    }));

    // Create grievance with auto-routing
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

/**
 * GET /api/grievances
 * List grievances — scoped by role:
 *   citizen → own grievances
 *   officer → assigned to them
 *   deptAdmin → department grievances
 *   sysAdmin → all
 */
const getGrievances = asyncHandler(async (req, res) => {
    const { role, _id: userId, departmentId } = req.user;
    const { status, priority, page = 1, limit = 20 } = req.query;

    let filter = {};

    if (role === 'citizen') {
        filter.submittedBy = userId;
    } else if (role === 'officer') {
        // Officers see grievances assigned to them OR in their department if unassigned
        if (departmentId) {
            filter.$or = [
                { assignedOfficer: userId },
                { assignedDepartment: departmentId, assignedOfficer: null },
            ];
        } else {
            filter.assignedOfficer = userId;
        }
    } else if (role === 'deptAdmin') {
        // DeptAdmin sees ALL grievances routed to their department
        if (departmentId) {
            filter.assignedDepartment = departmentId;
        }
        // If no departmentId set, show nothing rather than all
    }
    // sysAdmin: no filter, sees all

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

/**
 * GET /api/grievances/:id
 * Get single grievance by MongoDB _id or grievanceId
 */
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

    // Citizens can only view their own
    if (
        req.user.role === 'citizen' &&
        grievance.submittedBy._id.toString() !== req.user._id.toString()
    ) {
        return res.status(403).json({ message: 'Access denied' });
    }

    // Strip internal remarks for citizens
    const result = grievance.toObject();
    if (req.user.role === 'citizen') {
        delete result.remarks;
    }

    res.json({ grievance: result });
});

//  PHASE 3 — Workflow endpoints

const VALID_STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress', 'Resolved', 'Closed', 'Escalated'];

/**
 * PATCH /api/grievances/:id/status
 * Update grievance status (officer/deptAdmin/sysAdmin)
 */
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

    // Set transient fields for the pre-save hook
    grievance._statusChangedBy = req.user._id;
    grievance._statusNote = note || `Status changed to ${status}`;
    grievance.status = status;

    await grievance.save();

    res.json({
        message: `Status updated to '${status}'`,
        grievance: {
            grievanceId: grievance.grievanceId,
            status: grievance.status,
            statusHistory: grievance.statusHistory,
        },
    });
});

/**
 * PATCH /api/grievances/:id/assign
 * Assign an officer to a grievance (deptAdmin/sysAdmin)
 */
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

    // Auto-move to "In Review" if still Submitted
    if (grievance.status === 'Submitted') {
        grievance._statusChangedBy = req.user._id;
        grievance._statusNote = `Assigned to officer: ${officer.name}`;
        grievance.status = 'In Review';
    }

    await grievance.save();

    res.json({
        message: `Grievance assigned to ${officer.name}`,
        grievance: {
            grievanceId: grievance.grievanceId,
            assignedOfficer: { id: officer._id, name: officer.name, email: officer.email },
            status: grievance.status,
        },
    });
});

/**
 * POST /api/grievances/:id/remarks
 * Add an internal remark to a grievance (officer/admin)
 */
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

module.exports = {
    createGrievance,
    getGrievances,
    getGrievanceById,
    createGrievanceValidation,
    updateGrievanceStatus,
    assignOfficer,
    addRemark,
};
