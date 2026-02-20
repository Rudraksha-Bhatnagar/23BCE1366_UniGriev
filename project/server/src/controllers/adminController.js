const User = require('../models/User');
const Department = require('../models/Department');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/admin/users
 * List all users with optional role/department filters
 */
const getUsers = asyncHandler(async (req, res) => {
    const { role, departmentId, search, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (role) filter.role = role;
    if (departmentId) filter.departmentId = departmentId;
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
        User.find(filter)
            .populate('departmentId', 'name')
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        User.countDocuments(filter),
    ]);

    res.json({
        users,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        },
    });
});

/**
 * GET /api/admin/users/officers
 * List officers for assignment dropdown (deptAdmin gets own dept, sysAdmin gets all)
 */
const getOfficers = asyncHandler(async (req, res) => {
    let filter = { role: { $in: ['officer', 'deptAdmin'] }, isActive: true };

    // deptAdmin only sees officers in their department
    if (req.user.role === 'deptAdmin' && req.user.departmentId) {
        filter.departmentId = req.user.departmentId;
    }

    const officers = await User.find(filter)
        .select('name email role departmentId')
        .populate('departmentId', 'name')
        .lean();

    res.json({ officers });
});

/**
 * PATCH /api/admin/users/:id
 * Update user role, department, or active status
 */
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, departmentId, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (role) user.role = role;
    if (departmentId !== undefined) user.departmentId = departmentId || null;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    res.json({
        message: 'User updated',
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
            isActive: user.isActive,
        },
    });
});

/**
 * DELETE /api/admin/users/:id
 * Deactivate a user (soft delete)
 */
const deactivateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: `User '${user.name}' deactivated` });
});

module.exports = { getUsers, getOfficers, updateUser, deactivateUser };
