const express = require('express');
const router = express.Router();
const routineService = require('../services/routine.service');
const authMiddleware = require('../middleware/auth.middleware');

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

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { course_id, day_of_week, start_time, end_time, room_number, section } = req.body;
        if (!course_id || !day_of_week || !start_time || !end_time || !room_number || !section) {
            return res.status(400).json({ error: 'All routine fields (including section) are required' });
        }
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

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { course_id, day_of_week, start_time, end_time, room_number, section } = req.body;
        if (!course_id || !day_of_week || !start_time || !end_time || !room_number || !section) {
            return res.status(400).json({ error: 'All routine fields (including section) are required' });
        }
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

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await routineService.deleteRoutine(req.params.id);
        return res.json({ message: 'Routine entry deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
