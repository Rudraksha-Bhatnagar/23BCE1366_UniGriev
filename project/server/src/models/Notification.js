const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        grievanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Grievance',
            default: null,
        },
        grievanceRefId: {
            type: String,
            default: null,
        },
        type: {
            type: String,
            enum: ['status_update', 'assignment', 'escalation', 'feedback_request', 'forward'],
            default: 'status_update',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
