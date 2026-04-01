const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    createGrievance,
    getGrievances,
    getGrievanceById,
    createGrievanceValidation,
    updateGrievanceStatus,
    assignOfficer,
    addRemark,
    submitFeedback,
    forwardGrievance,
    escalateGrievance,
    reassignDepartment,
} = require('../controllers/grievanceController');
const { getStats } = require('../controllers/statsController');

router.use(protect);

router.post('/', upload.array('attachments', 5), createGrievanceValidation, createGrievance);
router.get('/stats', getStats);
router.get('/', getGrievances);
router.get('/:id', getGrievanceById);
router.patch('/:id/status', authorizeRoles('officer', 'deptAdmin', 'sysAdmin'), updateGrievanceStatus);
router.patch('/:id/assign', authorizeRoles('deptAdmin', 'sysAdmin'), assignOfficer);
router.post('/:id/remarks', authorizeRoles('officer', 'deptAdmin', 'sysAdmin'), addRemark);
router.post('/:id/feedback', submitFeedback);
router.patch('/:id/forward', authorizeRoles('officer', 'deptAdmin', 'sysAdmin'), forwardGrievance);
router.patch('/:id/escalate', escalateGrievance);
router.patch('/:id/reassign-department', authorizeRoles('sysAdmin'), reassignDepartment);

module.exports = router;
