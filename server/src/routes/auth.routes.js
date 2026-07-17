const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authService = require('../services/auth.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validate.middleware');
const logger = require('../config/logger');

// Rate limiting on login: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many registration attempts. Please try again in an hour.' },
    standardHeaders: true,
    legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many password reset requests. Please try again in an hour.' },
    standardHeaders: true,
    legacyHeaders: false
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many OTP verification attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const twoFALimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many 2FA attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     description: Create a new CR or admin account. Rate limited to 3 attempts per hour.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, minLength: 3, maxLength: 50, pattern: '^[a-zA-Z0-9_]+$' }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 128 }
 *               displayName: { type: string, maxLength: 100 }
 *               role: { type: string, enum: [cr, admin], default: cr }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or duplicate username/email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', registerLimiter, validate(schemas.auth.register), async (req, res) => {
    try {
        const { username, email, password, displayName, role } = req.body;
        const result = await authService.register(username, email, password, displayName, role);
        return res.status(201).json(result);
    } catch (err) {
        logger.warn({ username: req.body?.username, email: req.body?.email, ip: req.ip }, `Registration failed: ${err.message}`);
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with username and password
 *     description: Authenticate and receive a JWT token. Rate limited to 5 attempts per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials or 2FA required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, validate(schemas.auth.login), async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        return res.json(result);
    } catch (err) {
        logger.warn({ username: req.body?.username, ip: req.ip }, `Login failed: ${err.message}`);
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/login-2fa:
 *   post:
 *     tags: [Auth]
 *     summary: Complete login with 2FA code
 *     description: Verify TOTP code after login returns requiresTwoFactor. Rate limited to 5 per 15 min.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, token]
 *             properties:
 *               userId: { type: integer, description: User ID from the login response }
 *               token: { type: string, length: 6, pattern: '^\\d{6}$', description: 6-digit TOTP code }
 *     responses:
 *       200:
 *         description: 2FA verified, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid 2FA code
 */
router.post('/login-2fa', twoFALimiter, validate(schemas.auth.verify2FA), async (req, res) => {
    try {
        const { userId, token } = req.body;
        const result = await authService.verify2FALogin(userId, token);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await authService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update display name
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [displayName]
 *             properties:
 *               displayName: { type: string, maxLength: 100 }
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 */
router.put('/profile', authMiddleware, validate(schemas.auth.updateProfile), async (req, res) => {
    try {
        const { displayName } = req.body;
        const result = await authService.updateProfile(req.user.id, { displayName });
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/username:
 *   put:
 *     tags: [Auth]
 *     summary: Change username
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newUsername, password]
 *             properties:
 *               newUsername: { type: string, minLength: 3, maxLength: 50, pattern: '^[a-zA-Z0-9_]+$' }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Username changed, returns new JWT token
 *       400:
 *         description: Validation error
 */
router.put('/username', authMiddleware, validate(schemas.auth.changeUsername), async (req, res) => {
    try {
        const { newUsername, password } = req.body;
        const result = await authService.changeUsername(req.user.id, newUsername, password);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/email:
 *   put:
 *     tags: [Auth]
 *     summary: Change email address
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newEmail, password]
 *             properties:
 *               newEmail: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Email changed
 *       400:
 *         description: Validation error
 */
router.put('/email', authMiddleware, validate(schemas.auth.changeEmail), async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        const result = await authService.changeEmail(req.user.id, newEmail, password);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/password:
 *   put:
 *     tags: [Auth]
 *     summary: Change password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8, maxLength: 128 }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 */
router.put('/password', authMiddleware, validate(schemas.auth.changePassword), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 *     description: Sends OTP to email if configured, otherwise logs to console. Rate limited to 3 per hour.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: OTP sent if account exists
 *       400:
 *         description: Validation error
 */
router.post('/forgot-password', forgotPasswordLimiter, validate(schemas.auth.forgotPassword), async (req, res) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify password reset OTP
 *     description: Rate limited to 5 per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, length: 6, pattern: '^\\d{6}$' }
 *     responses:
 *       200:
 *         description: OTP verified
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-otp', otpLimiter, validate(schemas.auth.verifyOtp), async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await authService.verifyOtp(email, otp);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, length: 6 }
 *               newPassword: { type: string, minLength: 8, maxLength: 128 }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Validation error
 */
router.post('/reset-password', validate(schemas.auth.resetPassword), async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await authService.resetPassword(email, otp, newPassword);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Setup 2FA (generate secret)
 *     description: Generates a TOTP secret and otpauth URL for authenticator apps.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret: { type: string }
 *                 otpauth_url: { type: string }
 *       400:
 *         description: Error
 */
router.post('/2fa/setup', authMiddleware, async (req, res) => {
    try {
        const result = await authService.setup2FA(req.user.id);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/2fa/enable:
 *   post:
 *     tags: [Auth]
 *     summary: Enable 2FA (verify and activate)
 *     description: Verifies a TOTP code and enables 2FA for the user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, length: 6, pattern: '^\\d{6}$' }
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       400:
 *         description: Invalid code
 */
router.post('/2fa/enable', authMiddleware, validate(schemas.auth.enable2FA), async (req, res) => {
    try {
        const { token } = req.body;
        const result = await authService.enable2FA(req.user.id, token);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Disable 2FA
 *     description: Disables 2FA after verifying the user's password.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       400:
 *         description: Wrong password
 */
router.post('/2fa/disable', authMiddleware, validate(schemas.auth.disable2FA), async (req, res) => {
    try {
        const { password } = req.body;
        const result = await authService.disable2FA(req.user.id, password);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

module.exports = router;
