const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getUsers,
    getOfficers,
    updateUser,
    deactivateUser,
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(protect);

// Officers list (deptAdmin + sysAdmin)
router.get('/users/officers', authorizeRoles('deptAdmin', 'sysAdmin'), getOfficers);

// User management (sysAdmin only)
router.get('/users', authorizeRoles('sysAdmin'), getUsers);
router.patch('/users/:id', authorizeRoles('sysAdmin'), updateUser);
router.delete('/users/:id', authorizeRoles('sysAdmin'), deactivateUser);

module.exports = router;
