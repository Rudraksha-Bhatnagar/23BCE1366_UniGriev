const Grievance = require('../models/Grievance');
const { asyncHandler } = require('../middleware/errorHandler');

const PENDING_STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress'];
const RESOLVED_STATUSES = ['Resolved', 'Closed'];

const getStats = asyncHandler(async (req, res) => {
    const { role, _id: userId, departmentId } = req.user;

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

    const [total, pending, resolved, escalated] = await Promise.all([
        Grievance.countDocuments(filter),
        Grievance.countDocuments({ ...filter, status: { $in: PENDING_STATUSES } }),
        Grievance.countDocuments({ ...filter, status: { $in: RESOLVED_STATUSES } }),
        Grievance.countDocuments({ ...filter, status: 'Escalated' }),
    ]);

    res.json({ total, pending, resolved, escalated });
});

module.exports = { getStats };
