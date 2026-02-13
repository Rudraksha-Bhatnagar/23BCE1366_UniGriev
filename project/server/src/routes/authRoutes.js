const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    register,
    login,
    refreshTokenHandler,
    getMe,
    registerValidation,
    loginValidation,
} = require('../controllers/authController');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshTokenHandler);
router.get('/me', protect, getMe);

module.exports = router;
