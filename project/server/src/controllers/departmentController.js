const Department = require('../models/Department');
const { asyncHandler } = require('../middleware/errorHandler');

const getDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find({ isActive: true }).lean();
    res.json({ departments });
});

const createDepartment = asyncHandler(async (req, res) => {
    const { name, contactEmail } = req.body;
    const department = await Department.create({ name, contactEmail });
    res.status(201).json({ message: 'Department created', department });
});

const updateDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ department });
});

module.exports = { getDepartments, createDepartment, updateDepartment };
