const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const { OTP_TYPE } = require('../config/constants');
const logger = require('../config/logger');

if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Please define it in your .env file.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(user) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

async function register(username, email, password, displayName, role = 'cr') {
    const trimmedUsername = username.trim();
    const checkUsername = await db.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [trimmedUsername]);
    if (checkUsername.rows.length > 0) {
        throw new Error('Username already exists');
    }

    const checkEmail = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (checkEmail.rows.length > 0) {
        throw new Error('Email already exists');
    }

    if (trimmedUsername !== username) {
        username = trimmedUsername;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
        'INSERT INTO users (username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [username, email, passwordHash, displayName || username, role]
    );

    const user = result.rows[0];
    delete user.password_hash;
    delete user.two_factor_secret;

    const token = generateToken(user);
    return { user, token };
}

async function login(username, password) {
    const result = await db.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    if (result.rows.length === 0) {
        throw new Error('Invalid username or password');
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error('Invalid username or password');
    }

    // Check 2FA
    if (user.two_factor_enabled) {
        return {
            requiresTwoFactor: true,
            userId: user.id,
            message: '2FA code required'
        };
    }

    delete user.password_hash;
    delete user.two_factor_secret;

    const token = generateToken(user);
    logger.debug({ userId: user?.id, username: user?.username }, 'Login response sent');
    return { user, token };
}

async function verify2FALogin(userId, token) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];
    if (!user.two_factor_enabled || !user.two_factor_secret) {
        throw new Error('2FA is not enabled for this user');
    }

    const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token,
        window: 2
    });

    if (!verified) {
        throw new Error('Invalid 2FA code');
    }

    delete user.password_hash;
    delete user.two_factor_secret;

    const jwtToken = generateToken(user);
    return { user, token: jwtToken };
}

async function changePassword(userId, currentPassword, newPassword) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
        throw new Error('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
    );

    return { message: 'Password changed successfully' };
}

async function updateProfile(userId, { displayName }) {
    const result = await db.query(
        'UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [displayName, userId]
    );
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    const user = result.rows[0];
    delete user.password_hash;
    delete user.two_factor_secret;
    return { user };
}

async function changeEmail(userId, newEmail, password) {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isMatch) {
        throw new Error('Password is incorrect');
    }

    if (userResult.rows[0].email === newEmail) {
        delete userResult.rows[0].password_hash;
        delete userResult.rows[0].two_factor_secret;
        return { user: userResult.rows[0] };
    }

    const check = await db.query('SELECT * FROM users WHERE email = $1', [newEmail]);
    if (check.rows.length > 0) {
        throw new Error('Email already in use');
    }

    const result = await db.query(
        'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newEmail, userId]
    );
    const user = result.rows[0];
    delete user.password_hash;
    delete user.two_factor_secret;

    return { user };
}

async function changeUsername(userId, newUsername, password) {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isMatch) {
        throw new Error('Password is incorrect');
    }

    const check = await db.query('SELECT * FROM users WHERE username = $1', [newUsername]);
    if (check.rows.length > 0) {
        throw new Error('Username already taken');
    }

    const result = await db.query(
        'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newUsername, userId]
    );
    const user = result.rows[0];
    delete user.password_hash;
    delete user.two_factor_secret;

    const token = generateToken(user);
    return { user, token };
}

async function forgotPassword(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
        // Don't reveal if email exists, but still "send" to prevent enumeration
        return { message: 'If an account with that email exists, an OTP has been sent.' };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min expiry

    await db.query(
        'INSERT INTO otps (email, otp, type, expires_at) VALUES ($1, $2, $3, $4)',
        [email, otp, OTP_TYPE.PASSWORD_RESET, expiresAt]
    );

    // Send email via nodemailer if configured
    try {
        if (process.env.SMTP_HOST) {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@announcement.app',
                to: email,
                subject: 'Password Reset OTP',
                text: `Your OTP for password reset is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`
            });
        } else {
            logger.info({ email, otp }, 'Password reset OTP (email not configured)');
        }
    } catch (err) {
        logger.error({ err, email }, 'Failed to send OTP email, logging OTP instead');
        logger.info({ email, otp }, 'Password reset OTP (email send failed)');
    }

    return { message: 'If an account with that email exists, an OTP has been sent.' };
}

async function verifyOtp(email, otp) {
    const otpResult = await db.query(
        'SELECT * FROM otps WHERE email = $1 AND type = $2 AND used = false',
        [email, OTP_TYPE.PASSWORD_RESET]
    );

    if (otpResult.rows.length === 0) {
        throw new Error('Invalid or expired OTP');
    }

    const storedOtp = otpResult.rows[0];

    if (storedOtp.otp !== otp) {
        throw new Error('Invalid or expired OTP');
    }

    if (new Date(storedOtp.expires_at) < new Date()) {
        throw new Error('OTP has expired');
    }

    return { valid: true };
}

async function resetPassword(email, otp, newPassword) {
    const otpResult = await db.query(
        'SELECT * FROM otps WHERE email = $1 AND type = $2 AND used = false',
        [email, OTP_TYPE.PASSWORD_RESET]
    );

    if (otpResult.rows.length === 0) {
        throw new Error('Invalid or expired OTP');
    }

    const storedOtp = otpResult.rows[0];

    if (storedOtp.otp !== otp) {
        throw new Error('Invalid or expired OTP');
    }

    if (new Date(storedOtp.expires_at) < new Date()) {
        throw new Error('OTP has expired');
    }

    // Mark OTP as used
    await db.query('UPDATE otps SET used = true WHERE id = $1', [storedOtp.id]);

    // Update password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [passwordHash, email]
    );

    return { message: 'Password reset successfully' };
}

async function getUserById(id) {
    const result = await db.query('SELECT id, username, role, display_name, email, is_active, two_factor_enabled, created_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}

async function setup2FA(userId) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const secret = speakeasy.generateSecret({
        name: `CR Announcements (${result.rows[0].username})`,
        length: 20
    });

    // Store secret temporarily (not enabled yet)
    await db.query(
        'UPDATE users SET two_factor_secret = $1, two_factor_enabled = $2, updated_at = NOW() WHERE id = $3',
        [secret.base32, false, userId]
    );

    return {
        secret: secret.base32,
        otpauth_url: secret.otpauth_url
    };
}

async function enable2FA(userId, token) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];
    if (!user.two_factor_secret) {
        throw new Error('2FA not set up. Generate a secret first.');
    }

    const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token,
        window: 2
    });

    if (!verified) {
        throw new Error('Invalid 2FA code. Please try again.');
    }

    await db.query(
        'UPDATE users SET two_factor_enabled = $1, updated_at = NOW() WHERE id = $2',
        [true, userId]
    );

    return { message: '2FA enabled successfully' };
}

async function disable2FA(userId, password) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!isMatch) {
        throw new Error('Password is incorrect');
    }

    await db.query(
        'UPDATE users SET two_factor_secret = $1, two_factor_enabled = $2, updated_at = NOW() WHERE id = $3',
        [null, false, userId]
    );

    return { message: '2FA disabled successfully' };
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
}

module.exports = {
    register,
    login,
    verify2FALogin,
    getUserById,
    verifyToken,
    changePassword,
    updateProfile,
    changeEmail,
    changeUsername,
    forgotPassword,
    resetPassword,
    verifyOtp,
    setup2FA,
    enable2FA,
    disable2FA
};
