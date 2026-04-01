const cron = require('node-cron');
const Grievance = require('../models/Grievance');
const { createNotification } = require('../services/notificationService');

const PENDING_STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress'];

const checkSLABreaches = async () => {
    console.log('[SLA Checker] Running SLA breach check...');

    try {
        const now = new Date();

        const breachedGrievances = await Grievance.find({
            status: { $in: PENDING_STATUSES },
            slaDeadline: { $lt: now },
        }).populate('assignedDepartment', 'name');

        if (breachedGrievances.length === 0) {
            console.log('[SLA Checker] No SLA breaches found.');
            return;
        }

        const User = require('../models/User');
        let escalatedCount = 0;

        for (const grievance of breachedGrievances) {
            grievance._statusChangedBy = null;
            grievance._statusNote = 'Auto-escalated: SLA deadline breached';
            grievance.status = 'Escalated';
            await grievance.save();
            escalatedCount++;

            // Notify the submitter
            await createNotification(
                grievance.submittedBy,
                `Your grievance ${grievance.grievanceId} has been auto-escalated due to SLA breach.`,
                grievance._id,
                grievance.grievanceId,
                'escalation'
            );

            // Notify dept admins
            if (grievance.assignedDepartment) {
                const deptAdmins = await User.find({
                    role: { $in: ['deptAdmin', 'sysAdmin'] },
                    departmentId: grievance.assignedDepartment._id || grievance.assignedDepartment,
                    isActive: true,
                });

                for (const admin of deptAdmins) {
                    await createNotification(
                        admin._id,
                        `Grievance ${grievance.grievanceId} has been auto-escalated due to SLA breach.`,
                        grievance._id,
                        grievance.grievanceId,
                        'escalation'
                    );
                }
            }
        }

        console.log(`[SLA Checker] Auto-escalated ${escalatedCount} grievance(s).`);
    } catch (err) {
        console.error('[SLA Checker] Error during SLA check:', err.message);
    }
};

const start = () => {
    // Run at midnight every day
    cron.schedule('0 0 * * *', checkSLABreaches);
    console.log('[SLA Checker] Scheduled nightly SLA check at midnight.');
};

module.exports = { start, checkSLABreaches };
