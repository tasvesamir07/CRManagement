const express = require('express');
const router = express.Router();
const attendanceService = require('../services/attendance.service');
const pdfService = require('../services/pdf.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateQuery, validateParams, schemas } = require('../middleware/validate.middleware');

router.get('/', authMiddleware, validateQuery('page', 'limit', 'course_id', 'date'), async (req, res) => {
  try {
    const { page = 1, limit = 100, course_id, date, exam_routine_id } = req.query;
    const result = await attendanceService.listAttendance({ page: Number(page), limit: Number(limit), course_id, date, exam_routine_id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', authMiddleware, validate(schemas.attendance.bulkMark), async (req, res) => {
  try {
    req.body.marked_by = req.user.id;
    const result = await attendanceService.bulkMarkAttendance(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/course/:courseId/date/:date', authMiddleware, validateParams, async (req, res) => {
  try {
    const { courseId, date } = req.params;
    const result = await attendanceService.getEnrolledStudentsWithAttendance(courseId, date);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/course/:courseId/date/:date/pdf', authMiddleware, validateParams, async (req, res) => {
  try {
    const { courseId, date } = req.params;
    const pdfBuffer = await pdfService.generateAttendancePdf(courseId, date);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${courseId}-${date}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.attendance.update), async (req, res) => {
  try {
    const result = await attendanceService.updateAttendance(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
  try {
    const result = await attendanceService.deleteAttendance(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:studentId/summary', authMiddleware, validateParams(schemas.params.studentId), async (req, res) => {
  try {
    const { course_id } = req.query;
    const result = await attendanceService.getStudentSummary(req.params.studentId, course_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
