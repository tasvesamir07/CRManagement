const express = require('express');
const router = express.Router();
const routineService = require('../services/routine.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

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
        return res.status(500).json({ error: err.message });
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
        return res.status(400).json({ error: err.message });
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
        return res.status(400).json({ error: err.message });
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
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
