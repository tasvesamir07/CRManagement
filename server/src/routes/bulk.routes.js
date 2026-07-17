const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const cache = require('../config/cache');
const { validate, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /bulk/courses/delete:
 *   post:
 *     tags: [Bulk]
 *     summary: Bulk delete courses (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Deleted course count and IDs
 */
router.post('/courses/delete', adminMiddleware, validate(schemas.bulk.deleteIds), async (req, res) => {
    try {
        const { ids } = req.body;
        const result = await db.query(
            'UPDATE courses SET is_active = false WHERE id = ANY($1::int[]) RETURNING id',
            [ids]
        );
        cache.invalidatePattern('courses:');
        return res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /bulk/platforms/delete:
 *   post:
 *     tags: [Bulk]
 *     summary: Bulk delete platforms
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Deleted platform count and IDs
 */
router.post('/platforms/delete', authMiddleware, validate(schemas.bulk.deleteIds), async (req, res) => {
    try {
        const { ids } = req.body;
        // Delete referenced rows in announcement_platforms first
        await db.query('DELETE FROM announcement_platforms WHERE platform_id = ANY($1::int[])', [ids]);
        
        // Delete the platforms themselves
        const result = await db.query(
            'DELETE FROM platforms WHERE id = ANY($1::int[]) RETURNING id',
            [ids]
        );
        cache.invalidatePattern('platforms:');
        return res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /bulk/announcements/delete:
 *   post:
 *     tags: [Bulk]
 *     summary: Bulk delete announcements
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Deleted announcement count and IDs
 */
router.post('/announcements/delete', authMiddleware, validate(schemas.bulk.deleteIds), async (req, res) => {
    try {
        const { ids } = req.body;
        const result = await db.query(
            'DELETE FROM announcements WHERE id = ANY($1::int[]) RETURNING id',
            [ids]
        );
        return res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

const fileService = require('../services/file.service');
/**
 * @openapi
 * /bulk/files/delete:
 *   post:
 *     tags: [Bulk]
 *     summary: Bulk delete files
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Deleted file count and IDs
 */
router.post('/files/delete', authMiddleware, validate(schemas.bulk.deleteIds), async (req, res) => {
    try {
        const { ids } = req.body;
        let count = 0;
        for (const id of ids) {
            const success = await fileService.deleteFile(id);
            if (success) count++;
        }
        return res.json({ deleted: count, ids });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /bulk/platforms/test-connections:
 *   post:
 *     tags: [Bulk]
 *     summary: Test all platform connections
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status for each platform
 */
router.post('/platforms/test-connections', authMiddleware, async (req, res) => {
    try {
        const whatsappStatus = require('../services/whatsapp.service').getStatus();
        const telegramStatus = require('../services/telegram.service').isMock();
        return res.json({
            whatsapp: !whatsappStatus.isMock && whatsappStatus.status === 'CONNECTED',
            telegram: !telegramStatus
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /bulk/routines/batch:
 *   post:
 *     tags: [Bulk]
 *     summary: Batch create routine entries
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               course_id:
 *                 type: integer
 *               days:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day_of_week:
 *                       type: string
 *                     start_time:
 *                       type: string
 *                     end_time:
 *                       type: string
 *                     room_number:
 *                       type: string
 *                     section:
 *                       type: string
 *     responses:
 *       201:
 *         description: Routines created
 *       400:
 *         description: Validation error
 */
router.post('/routines/batch', authMiddleware, validate(schemas.bulk.createRoutines), async (req, res) => {
    try {
        const { course_id, days } = req.body;
        const results = [];
        for (const day of days) {
            const { day_of_week, start_time, end_time, room_number, section } = day;
            const r = await db.query(
                'INSERT INTO routines (course_id, day_of_week, start_time, end_time, room_number, section) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [course_id, day_of_week, start_time, end_time, room_number || '', section || '']
            );
            results.push(r.rows[0]);
        }
        return res.status(201).json({ created: results.length, routines: results });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

module.exports = router;
