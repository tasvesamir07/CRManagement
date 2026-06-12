const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const auditService = require('../services/audit.service');

// GET /api/logs
// Retrieves logs. Accessible by CRs (scoped to their own logs) and admins (all logs).
router.get('/', authMiddleware, async (req, res) => {
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

// DELETE /api/logs/:id
// Deletes a single log entry. CRs can only delete their own.
router.delete('/:id', authMiddleware, async (req, res) => {
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

// DELETE /api/logs
// Clears logs. CRs can only clear their own.
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
