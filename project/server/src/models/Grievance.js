const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema(
    {
        grievanceId: {
            type: String,
            unique: true,
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium',
        },
        status: {
            type: String,
            enum: [
                'Submitted',
                'In Review',
                'Awaiting Info',
                'In Progress',
                'Resolved',
                'Closed',
                'Escalated',
            ],
            default: 'Submitted',
        },
        assignedDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            default: null,
        },
        assignedOfficer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        slaDeadline: {
            type: Date,
            default: null,
        },

        // ── Embedded arrays ────────────────────────────────────
        statusHistory: [
            {
                status: { type: String, required: true },
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                timestamp: { type: Date, default: Date.now },
                note: { type: String, default: '' },
            },
        ],
        remarks: [
            {
                officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                text: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        attachments: [
            {
                filename: { type: String, required: true },
                path: { type: String, required: true },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
        feedback: {
            rating: { type: Number, min: 1, max: 5 },
            comments: { type: String },
            submittedAt: { type: Date },
        },
    },
    { timestamps: true }
);

// Index for common queries
grievanceSchema.index({ submittedBy: 1, status: 1 });
grievanceSchema.index({ assignedDepartment: 1, status: 1 });
grievanceSchema.index({ assignedOfficer: 1, status: 1 });
grievanceSchema.index({ grievanceId: 1 });

// Pre-save: auto-append status change to statusHistory
grievanceSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            changedBy: this._statusChangedBy || this.submittedBy,
            note: this._statusNote || '',
        });
    }
    next();
});

/**
 * Generate a unique grievance ID: GRV-<YYMMDD>-<random 4 chars>
 */
grievanceSchema.statics.generateGrievanceId = function () {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GRV-${yy}${mm}${dd}-${rand}`;
};

module.exports = mongoose.model('Grievance', grievanceSchema);
