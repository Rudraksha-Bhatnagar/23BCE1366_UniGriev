const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getUsers,
    getOfficers,
    updateUser,
    deactivateUser,
} = require('../controllers/adminController');

router.use(protect);

router.get('/users/officers', authorizeRoles('deptAdmin', 'sysAdmin'), getOfficers);

router.get('/users', authorizeRoles('sysAdmin'), getUsers);
router.patch('/users/:id', authorizeRoles('sysAdmin'), updateUser);
router.delete('/users/:id', authorizeRoles('sysAdmin'), deactivateUser);

module.exports = router;
