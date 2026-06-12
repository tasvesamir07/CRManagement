const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authService = require('../services/auth.service');
const authMiddleware = require('../middleware/auth.middleware');

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

router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { username, email, password, displayName, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }
        const result = await authService.register(username, email, password, displayName, role);
        return res.status(201).json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const result = await authService.login(username, password);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/login-2fa', twoFALimiter, async (req, res) => {
    try {
        const { userId, token } = req.body;
        if (!userId || !token) {
            return res.status(400).json({ error: 'userId and token are required' });
        }
        const result = await authService.verify2FALogin(userId, token);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

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

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { displayName } = req.body;
        if (!displayName) {
            return res.status(400).json({ error: 'displayName is required' });
        }
        const result = await authService.updateProfile(req.user.id, { displayName });
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.put('/username', authMiddleware, async (req, res) => {
    try {
        const { newUsername, password } = req.body;
        if (!newUsername || !password) {
            return res.status(400).json({ error: 'newUsername and password are required' });
        }
        const result = await authService.changeUsername(req.user.id, newUsername, password);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.put('/email', authMiddleware, async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        if (!newEmail || !password) {
            return res.status(400).json({ error: 'newEmail and password are required' });
        }
        const result = await authService.changeEmail(req.user.id, newEmail, password);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const result = await authService.forgotPassword(email);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/verify-otp', otpLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }
        const result = await authService.verifyOtp(email, otp);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'email, otp, and newPassword are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        const result = await authService.resetPassword(email, otp, newPassword);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/2fa/setup', authMiddleware, async (req, res) => {
    try {
        const result = await authService.setup2FA(req.user.id);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/2fa/enable', authMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: '2FA token is required' });
        }
        const result = await authService.enable2FA(req.user.id, token);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/2fa/disable', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        const result = await authService.disable2FA(req.user.id, password);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

module.exports = router;
