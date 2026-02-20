const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Department name is required'],
            unique: true,
            trim: true,
        },
        contactEmail: {
            type: String,
            required: [true, 'Contact email is required'],
            lowercase: true,
            trim: true,
        },
        headOfficerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
