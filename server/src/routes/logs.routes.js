const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const auditService = require('../services/audit.service');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /logs:
 *   get:
 *     tags: [Logs]
 *     summary: Retrieve audit logs
 *     description: Accessible by CRs (scoped to their own logs) and admins (all logs)
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
router.get('/', authMiddleware, validate(schemas.logs.listQuery), async (req, res) => {
    try {
        const { page, limit, action, entityType } = req.query;
        let userIdFilter = req.query.userId;

        // Scope the user logs access:
        // CR users can ONLY see their own logs. We force the filter to their user ID.
        if (req.user.role !== 'admin') {
            userIdFilter = req.user.id;
        }

        const result = await auditService.getLogs({
            page: parseInt(page) || 1,
            limit: Math.min(parseInt(limit) || 50, 100),
            userId: userIdFilter,
            action,
            entityType
        });

        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /logs/{id}:
 *   delete:
 *     tags: [Logs]
 *     summary: Delete a single log entry
 *     description: CRs can only delete their own logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Log ID
 *     responses:
 *       200:
 *         description: Log deleted successfully
 *       404:
 *         description: Log not found or access denied
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const logId = parseInt(req.params.id);
        const userId = req.user.role === 'admin' ? null : req.user.id;

        const deleted = await auditService.deleteLog(logId, userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Log not found or access denied.' });
        }

        return res.json({ message: 'Log deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /logs:
 *   delete:
 *     tags: [Logs]
 *     summary: Clear all logs
 *     description: CRs can only clear their own logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs cleared successfully
 */
router.delete('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;

        await auditService.clearLogs(userId);

        return res.json({ message: 'Logs cleared successfully.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
