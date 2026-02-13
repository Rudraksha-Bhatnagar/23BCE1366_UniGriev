const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Helper: generate token pair ──────────────────────────────────
const generateAccessToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

const generateRefreshToken = (user) =>
    jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

// ── Validation rules ─────────────────────────────────────────────
const registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('mobileNo').trim().notEmpty().withMessage('Mobile number is required'),
    body('role')
        .optional()
        .isIn(['citizen', 'officer', 'deptAdmin', 'sysAdmin'])
        .withMessage('Invalid role'),
];

const loginValidation = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
];

// ── Controllers ──────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = asyncHandler(async (req, res) => {
    // Check validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password, mobileNo, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Create user (password hashing handled by pre-save hook)
    const user = await User.create({
        name,
        email,
        passwordHash: password, // pre-save hook will hash this
        mobileNo,
        role: role || 'citizen',
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
        message: 'Registration successful',
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        accessToken,
        refreshToken,
    });
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
const login = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user and explicitly include passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
        return res.status(401).json({ message: 'Account has been deactivated' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
        message: 'Login successful',
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        accessToken,
        refreshToken,
    });
});

/**
 * POST /api/auth/refresh
 * Issue a new access token using a valid refresh token
 */
const refreshTokenHandler = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const newAccessToken = generateAccessToken(user);

        res.json({
            accessToken: newAccessToken,
        });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
});

/**
 * GET /api/auth/me
 * Get current logged-in user
 */
const getMe = asyncHandler(async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            mobileNo: req.user.mobileNo,
            role: req.user.role,
            isActive: req.user.isActive,
            createdAt: req.user.createdAt,
        },
    });
});

module.exports = {
    register,
    login,
    refreshTokenHandler,
    getMe,
    registerValidation,
    loginValidation,
};
