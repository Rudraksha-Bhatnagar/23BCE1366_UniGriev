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
} = require('../controllers/grievanceController');

// All grievance routes are protected
router.use(protect);

// Submit a new grievance
router.post('/', upload.array('attachments', 5), createGrievanceValidation, createGrievance);

// List grievances (role-scoped)
router.get('/', getGrievances);

// Get single grievance detail
router.get('/:id', getGrievanceById);

// Phase 3 — Workflow
router.patch('/:id/status', authorizeRoles('officer', 'deptAdmin', 'sysAdmin'), updateGrievanceStatus);
router.patch('/:id/assign', authorizeRoles('deptAdmin', 'sysAdmin'), assignOfficer);
router.post('/:id/remarks', authorizeRoles('officer', 'deptAdmin', 'sysAdmin'), addRemark);

module.exports = router;
