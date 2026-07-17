const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/admin.middleware');
const adminService = require('../services/admin.service');
const { audit } = require('../middleware/audit.middleware');
const auditService = require('../services/audit.service');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of users
 */
router.get('/users', adminMiddleware, async (req, res) => {
    try {
        const users = await adminService.getAllUsers();
        return res.json({ users });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /admin/users:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               displayName:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
router.post('/users', adminMiddleware, audit('admin.create_user', 'user'), validate(schemas.admin.createUser), async (req, res) => {
    try {
        const { username, email, password, displayName, role } = req.body;
        const user = await adminService.adminCreateUser({ username, email, password, displayName, role });
        return res.status(201).json({ user });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 */
router.put('/users/:id', adminMiddleware, audit('admin.update_user', 'user'), validateParams(schemas.params.userId), validate(schemas.admin.updateUser), async (req, res) => {
    try {
        const { displayName, role } = req.body;
        const user = await adminService.adminUpdateUser(parseInt(req.params.id), { displayName, role });
        return res.json({ user });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Error
 */
router.delete('/users/:id', adminMiddleware, audit('admin.delete_user', 'user'), validateParams(schemas.params.userId), async (req, res) => {
    try {
        const result = await adminService.adminDeleteUser(parseInt(req.params.id));
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Get audit logs (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
router.get('/audit-logs', adminMiddleware, validate(schemas.logs.listQuery), async (req, res) => {
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
