const express = require('express');
const router = express.Router();
const attendanceService = require('../services/attendance.service');
const pdfService = require('../services/pdf.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const course_id = parseInt(req.query.course_id) || null;
        const date = req.query.date || null;
        const exam_routine_id = req.query.exam_routine_id ? parseInt(req.query.exam_routine_id) : null;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const result = await attendanceService.getAttendance(course_id, date, exam_routine_id, page, limit);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/bulk', authMiddleware, validate(schemas.attendance.bulkMark), async (req, res) => {
    try {
        const result = await attendanceService.bulkMarkAttendance(req.body, req.user.id);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/course/:courseId/date/:date', authMiddleware, async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const date = req.params.date;
        const exam_routine_id = req.query.exam_routine_id ? parseInt(req.query.exam_routine_id) : null;
        const result = await attendanceService.getEnrolledStudentsWithAttendance(courseId, date, exam_routine_id);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/course/:courseId/date/:date/pdf', authMiddleware, async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const date = req.params.date;
        const exam_routine_id = req.query.exam_routine_id ? parseInt(req.query.exam_routine_id) : null;
        const pdfBuffer = await pdfService.generateAttendancePdf(courseId, date, exam_routine_id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${courseId}-${date}.pdf"`);
        return res.send(pdfBuffer);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.attendance.update), async (req, res) => {
    try {
        const result = await attendanceService.updateAttendance(req.params.id, req.body);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const result = await attendanceService.deleteAttendance(req.params.id);
        return res.json(result || { message: 'Attendance record deleted' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/student/:studentId/summary', authMiddleware, async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const course_id = req.query.course_id ? parseInt(req.query.course_id) : null;
        const result = await attendanceService.getAttendanceSummary(studentId, course_id);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
