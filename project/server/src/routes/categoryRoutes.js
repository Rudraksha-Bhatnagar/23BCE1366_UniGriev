const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getCategories,
    createCategory,
    updateCategory,
} = require('../controllers/categoryController');

router.get('/', protect, getCategories);
router.post('/', protect, authorizeRoles('sysAdmin'), createCategory);
router.put('/:id', protect, authorizeRoles('sysAdmin'), updateCategory);

module.exports = router;
