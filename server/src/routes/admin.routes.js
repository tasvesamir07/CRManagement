const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/admin.middleware');
const adminService = require('../services/admin.service');
const { audit } = require('../middleware/audit.middleware');
const auditService = require('../services/audit.service');

router.get('/users', adminMiddleware, async (req, res) => {
    try {
        const users = await adminService.getAllUsers();
        return res.json({ users });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/users', adminMiddleware, audit('admin.create_user', 'user'), async (req, res) => {
    try {
        const { username, email, password, displayName, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email, and password are required' });
        }
        const user = await adminService.adminCreateUser({ username, email, password, displayName, role });
        return res.status(201).json({ user });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.put('/users/:id', adminMiddleware, audit('admin.update_user', 'user'), async (req, res) => {
    try {
        const { displayName, role } = req.body;
        const user = await adminService.adminUpdateUser(parseInt(req.params.id), { displayName, role });
        return res.json({ user });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.delete('/users/:id', adminMiddleware, audit('admin.delete_user', 'user'), async (req, res) => {
    try {
        const result = await adminService.adminDeleteUser(parseInt(req.params.id));
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.get('/audit-logs', adminMiddleware, async (req, res) => {
    try {
        const { page, limit, userId, action, entityType } = req.query;
        const result = await auditService.getLogs({
            page: parseInt(page) || 1,
            limit: Math.min(parseInt(limit) || 50, 100),
            userId,
            action,
            entityType,
        });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
