const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getDepartments,
    createDepartment,
    updateDepartment,
} = require('../controllers/departmentController');

router.get('/', protect, getDepartments);
router.post('/', protect, authorizeRoles('sysAdmin'), createDepartment);
router.put('/:id', protect, authorizeRoles('sysAdmin'), updateDepartment);

module.exports = router;
