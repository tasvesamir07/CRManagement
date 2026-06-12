const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function getAllUsers() {
    const result = await db.query('SELECT * FROM users WHERE is_active = true');
    const users = result.rows.map(u => {
        delete u.password_hash;
        delete u.two_factor_secret;
        return u;
    });
    return users;
}

async function adminCreateUser({ username, email, password, displayName, role }) {
    const checkUsername = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (checkUsername.rows.length > 0) {
        throw new Error('Username already exists');
    }

    const checkEmail = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
        throw new Error('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
        'INSERT INTO users (username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [username, email, passwordHash, displayName || username, role || 'cr']
    );

    const user = result.rows[0];
    delete user.password_hash;
    delete user.two_factor_secret;
    return user;
}

async function adminUpdateUser(id, { displayName, role }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        params.push(displayName);
    }
    if (role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        params.push(role);
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
    );

    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];
    delete user.password_hash;
    delete user.two_factor_secret;
    return user;
}

async function adminDeleteUser(id) {
    const result = await db.query(
        'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [false, id]
    );
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    return { message: 'User deactivated successfully' };
}

module.exports = {
    getAllUsers,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser
};
