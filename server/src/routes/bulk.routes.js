const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

router.post('/courses/delete', adminMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        const result = await db.query(
            'UPDATE courses SET is_active = false WHERE id = ANY($1::int[]) RETURNING id',
            [ids]
        );
        return res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/platforms/delete', authMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        const result = await db.query(
            'UPDATE platforms SET is_active = false WHERE id = ANY($1::int[]) RETURNING id',
            [ids]
        );
        return res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/announcements/delete', authMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        const result = await db.query(
            'DELETE FROM announcements WHERE id = ANY($1::int[]) RETURNING id',
            [ids]
        );
        return res.json({ deleted: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

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

router.post('/routines/batch', authMiddleware, async (req, res) => {
    try {
        const { course_id, days } = req.body;
        if (!course_id || !days || !Array.isArray(days) || days.length === 0) {
            return res.status(400).json({ error: 'course_id and days array are required' });
        }
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
