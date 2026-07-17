const express = require('express');
const router = express.Router();
const examRoutineService = require('../services/examRoutine.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /exam-routines:
 *   get:
 *     tags: [Exam Routines]
 *     summary: List all exam routines
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *       - in: query
 *         name: exam_type
 *         schema:
 *           type: string
 *         description: Filter by exam type
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: Array of exam routines
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { course_id, exam_type, date_from, date_to } = req.query;
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const routines = await examRoutineService.getExamRoutines(
            course_id || null,
            exam_type || null,
            date_from || null,
            date_to || null,
            userId
        );
        return res.json(routines);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /exam-routines:
 *   post:
 *     tags: [Exam Routines]
 *     summary: Create a new exam routine
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
 *               exam_type:
 *                 type: string
 *               exam_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               room_number:
 *                 type: string
 *               section:
 *                 type: string
 *               instructions:
 *                 type: string
 *               canva_template_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Exam routine created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, validate(schemas.examRoutines.create), async (req, res) => {
    try {
        const { course_id, exam_type, exam_date, start_time, end_time, room_number, section, instructions, canva_template_id } = req.body;
        const routine = await examRoutineService.createExamRoutine({
            course_id,
            exam_type,
            exam_date,
            start_time,
            end_time,
            room_number,
            section,
            instructions,
            canva_template_id
        });
        return res.status(201).json(routine);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /exam-routines/{id}:
 *   get:
 *     tags: [Exam Routines]
 *     summary: Get an exam routine by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam routine ID
 *     responses:
 *       200:
 *         description: Exam routine object
 *       404:
 *         description: Not found
 */
router.get('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const routine = await examRoutineService.getExamRoutineById(req.params.id);
        if (!routine) {
            return res.status(404).json({ error: 'Exam routine not found' });
        }
        return res.json(routine);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /exam-routines/{id}:
 *   put:
 *     tags: [Exam Routines]
 *     summary: Update an exam routine
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam routine ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               course_id:
 *                 type: integer
 *               exam_type:
 *                 type: string
 *               exam_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               room_number:
 *                 type: string
 *               section:
 *                 type: string
 *               instructions:
 *                 type: string
 *               canva_template_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Exam routine updated
 *       400:
 *         description: Validation error
 */
router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.examRoutines.update), async (req, res) => {
    try {
        const { course_id, exam_type, exam_date, start_time, end_time, room_number, section, instructions, canva_template_id } = req.body;
        const routine = await examRoutineService.updateExamRoutine(req.params.id, {
            course_id,
            exam_type,
            exam_date,
            start_time,
            end_time,
            room_number,
            section,
            instructions,
            canva_template_id
        });
        return res.json(routine);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /exam-routines/{id}:
 *   delete:
 *     tags: [Exam Routines]
 *     summary: Delete an exam routine
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam routine ID
 *     responses:
 *       200:
 *         description: Exam routine deleted successfully
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        await examRoutineService.deleteExamRoutine(req.params.id);
        return res.json({ message: 'Exam routine deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
