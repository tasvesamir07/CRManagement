const express = require('express');
const router = express.Router();
const routineService = require('../services/routine.service');
const authMiddleware = require('../middleware/auth.middleware');
const db = require('../config/database');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');
const { handleServerError, handleClientError } = require('../middleware/error.middleware');

/**
 * @openapi
 * /routines:
 *   get:
 *     tags: [Routines]
 *     summary: List all routines
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *     responses:
 *       200:
 *         description: Array of routines
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.query;
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const routines = await routineService.getRoutines(course_id || null, userId);
        return res.json(routines);
    } catch (err) {
        return handleServerError(res, err);
    }
});

/**
 * @openapi
 * /routines:
 *   post:
 *     tags: [Routines]
 *     summary: Create a new routine entry
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
 *               day_of_week:
 *                 type: string
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               room_number:
 *                 type: string
 *               section:
 *                 type: string
 *     responses:
 *       201:
 *         description: Routine created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, validate(schemas.routines.create), async (req, res) => {
    try {
        const { course_id, day_of_week, start_time, end_time, room_number, section } = req.body;
        const routine = await routineService.createRoutine({
            course_id,
            day_of_week,
            start_time,
            end_time,
            room_number,
            section
        });
        return res.status(201).json(routine);
    } catch (err) {
        return handleClientError(res, err);
    }
});

/**
 * @openapi
 * /routines/{id}:
 *   put:
 *     tags: [Routines]
 *     summary: Update a routine entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Routine ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               course_id:
 *                 type: integer
 *               day_of_week:
 *                 type: string
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               room_number:
 *                 type: string
 *               section:
 *                 type: string
 *     responses:
 *       200:
 *         description: Routine updated
 *       400:
 *         description: Validation error
 */
router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.routines.update), async (req, res) => {
    try {
        const { course_id, day_of_week, start_time, end_time, room_number, section } = req.body;
        const routine = await routineService.updateRoutine(req.params.id, {
            course_id,
            day_of_week,
            start_time,
            end_time,
            room_number,
            section
        });
        return res.json(routine);
    } catch (err) {
        return handleClientError(res, err);
    }
});

/**
 * @openapi
 * /routines/{id}:
 *   delete:
 *     tags: [Routines]
 *     summary: Delete a routine entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Routine ID
 *     responses:
 *       200:
 *         description: Routine deleted successfully
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        await routineService.deleteRoutine(req.params.id);
        return res.json({ message: 'Routine entry deleted successfully' });
    } catch (err) {
        return handleServerError(res, err);
    }
});

/**
 * @openapi
 * /routines/settings:
 *   get:
 *     tags: [Routines]
 *     summary: Get persisted routine layout & design settings
 *   post:
 *     tags: [Routines]
 *     summary: Save routine layout & design settings
 */
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const result = await db.query("SELECT value FROM system_settings WHERE key = $1", ['class_routine_settings']);
        if (result.rows && result.rows.length > 0) {
            return res.json(JSON.parse(result.rows[0].value));
        }
        return res.json(null);
    } catch (err) {
        return handleServerError(res, err);
    }
});

router.post('/settings', authMiddleware, async (req, res) => {
    try {
        const { settings } = req.body;
        const incoming = typeof settings === 'string' ? JSON.parse(settings || '{}') : (settings || {});
        
        // Fetch existing stored settings to prevent overwriting keys
        const existingRes = await db.query("SELECT value FROM system_settings WHERE key = $1", ['class_routine_settings']);
        let existing = {};
        if (existingRes.rows && existingRes.rows.length > 0 && existingRes.rows[0].value) {
            try {
                existing = typeof existingRes.rows[0].value === 'string' 
                    ? JSON.parse(existingRes.rows[0].value) 
                    : existingRes.rows[0].value;
            } catch (e) {}
        }
        
        const mergedSettings = { ...existing, ...incoming };
        const serialized = JSON.stringify(mergedSettings);

        await db.query(
            `INSERT INTO system_settings (key, value)
             VALUES ($1, $2)
             ON CONFLICT (key)
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            ['class_routine_settings', serialized]
        );
        return res.json({ success: true, settings: mergedSettings });
    } catch (err) {
        return handleServerError(res, err);
    }
});

/**
 * @openapi
 * /routines/{id}:
 *   delete:
 *     tags: [Routines]
 *     summary: Delete a routine entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Routine ID
 *     responses:
 *       200:
 *         description: Routine deleted successfully
 *       404:
 *         description: Routine not found
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        await routineService.deleteRoutine(req.params.id);
        return res.json({ message: 'Routine entry deleted successfully' });
    } catch (err) {
        return handleServerError(res, err);
    }
});

/**
 * @openapi
 * /routines/{id}/move:
 *   post:
 *     tags: [Routines]
 *     summary: Move routine to another folder/grid
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Routine ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetFolderId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Routine moved successfully
 *       400:
 *         description: Target folder ID required
 *       500:
 *         description: Failed to move routine
 */
router.post('/:id/move', authMiddleware, async (req, res) => {
    try {
        const { targetFolderId } = req.body;
        if (targetFolderId === undefined || targetFolderId === null) {
            return res.status(400).json({ error: 'targetFolderId is required' });
        }
        const routine = await routineService.moveRoutine(req.params.id, targetFolderId);
        return res.json(routine);
    } catch (err) {
        return handleServerError(res, err);
    }
});

/**
 * @openapi
 * /routines/{id}/copy:
 *   post:
 *     tags: [Routines]
 *     summary: Copy routine to another folder/grid
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Routine ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetFolderId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Routine copied successfully
 *       400:
 *         description: Target folder ID required or routine not found
 *       500:
 *         description: Failed to copy routine
 */
router.post('/:id/copy', authMiddleware, async (req, res) => {
    try {
        const { targetFolderId } = req.body;
        if (targetFolderId === undefined || targetFolderId === null) {
            return res.status(400).json({ error: 'targetFolderId is required' });
        }
        const routine = await routineService.copyRoutine(req.params.id, targetFolderId);
        return res.status(201).json(routine);
    } catch (err) {
        return handleServerError(res, err);
    }
});

/**
 * @openapi
 * /routines/folders:
 *   get:
 *     tags: [Routines]
 *     summary: List all folders for routine selection
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of folders
 */
router.get('/folders', authMiddleware, async (req, res) => {
    try {
        const folders = await routineService.listFolders(req.user.id);
        return res.json(folders);
    } catch (err) {
        return handleServerError(res, err);
    }
});

module.exports = router;
