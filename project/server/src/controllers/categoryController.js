const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');

const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find()
        .populate('departmentId', 'name')
        .lean();
    res.json({ categories });
});

const createCategory = asyncHandler(async (req, res) => {
    const { name, departmentId, slaDays, description } = req.body;
    const category = await Category.create({ name, departmentId, slaDays, description });
    res.status(201).json({ message: 'Category created', category });
});

const updateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
});

module.exports = { getCategories, createCategory, updateCategory };
