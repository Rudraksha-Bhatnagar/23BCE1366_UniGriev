const Notification = require('../models/Notification');
const socketModule = require('../socket');

const createNotification = async (userId, message, grievanceObjectId, grievanceRefId, type = 'status_update') => {
    try {
        const notif = await Notification.create({
            userId,
            message,
            grievanceId: grievanceObjectId || null,
            grievanceRefId: grievanceRefId || null,
            type,
        });

        const io = socketModule.getIO();
        if (io) {
            io.to(userId.toString()).emit('notification', {
                _id: notif._id,
                message: notif.message,
                type: notif.type,
                grievanceRefId: notif.grievanceRefId,
                isRead: false,
                createdAt: notif.createdAt,
            });
        }

        return notif;
    } catch (err) {
        console.error('Failed to create notification:', err.message);
    }
};

const notifyStatusChange = async (grievance) => {
    const msg = `Your grievance ${grievance.grievanceId} status changed to "${grievance.status}".`;
    return createNotification(
        grievance.submittedBy,
        msg,
        grievance._id,
        grievance.grievanceId,
        'status_update'
    );
};

module.exports = { createNotification, notifyStatusChange };
