const Grievance = require('../models/Grievance');
const { asyncHandler } = require('../middleware/errorHandler');

const PENDING_STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress'];
const RESOLVED_STATUSES = ['Resolved', 'Closed'];

const buildDeptFilter = (req) => {
    if (req.user.role === 'deptAdmin' && req.user.departmentId) {
        return { assignedDepartment: req.user.departmentId };
    }
    return {};
};

const getOverview = asyncHandler(async (req, res) => {
    const filter = buildDeptFilter(req);

    const [total, pending, resolved, escalated] = await Promise.all([
        Grievance.countDocuments(filter),
        Grievance.countDocuments({ ...filter, status: { $in: PENDING_STATUSES } }),
        Grievance.countDocuments({ ...filter, status: { $in: RESOLVED_STATUSES } }),
        Grievance.countDocuments({ ...filter, status: 'Escalated' }),
    ]);

    res.json({ total, pending, resolved, escalated });
});

const getByStatus = asyncHandler(async (req, res) => {
    const filter = buildDeptFilter(req);

    const result = await Grievance.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    const data = result.map((r) => ({ status: r._id, count: r.count }));
    res.json({ data });
});

const getTrends = asyncHandler(async (req, res) => {
    const filter = buildDeptFilter(req);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const result = await Grievance.aggregate([
        { $match: { ...filter, createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const data = result.map((r) => ({
        month: `${MONTH_NAMES[r._id.month - 1]} ${r._id.year}`,
        count: r.count,
    }));

    res.json({ data });
});

const exportCSV = asyncHandler(async (req, res) => {
    const filter = buildDeptFilter(req);

    const grievances = await Grievance.find(filter)
        .populate('category', 'name')
        .populate('assignedDepartment', 'name')
        .populate('assignedOfficer', 'name email')
        .populate('submittedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

    const headers = [
        'Grievance ID', 'Title', 'Status', 'Priority', 'Category',
        'Department', 'Submitted By', 'Assigned Officer', 'SLA Deadline', 'Created At',
    ];

    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = grievances.map((g) => [
        g.grievanceId,
        g.title,
        g.status,
        g.priority,
        g.category?.name || '',
        g.assignedDepartment?.name || '',
        g.submittedBy ? `${g.submittedBy.name} (${g.submittedBy.email})` : '',
        g.assignedOfficer ? `${g.assignedOfficer.name} (${g.assignedOfficer.email})` : 'Unassigned',
        g.slaDeadline ? new Date(g.slaDeadline).toISOString().split('T')[0] : '',
        new Date(g.createdAt).toISOString().split('T')[0],
    ].map(escapeCSV).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="grievances-export.csv"');
    res.send(csv);
});

module.exports = { getOverview, getByStatus, getTrends, exportCSV };
