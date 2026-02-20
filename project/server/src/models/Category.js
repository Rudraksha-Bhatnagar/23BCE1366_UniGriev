const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Department reference is required'],
        },
        slaDays: {
            type: Number,
            required: true,
            default: 7,
            min: 1,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
    },
    { timestamps: true }
);

// Compound index for uniqueness within department
categorySchema.index({ name: 1, departmentId: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
