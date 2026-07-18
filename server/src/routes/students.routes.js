const express = require('express');
const router = express.Router();
const studentService = require('../services/student.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const course_id = req.query.course_id || null;
        const search = req.query.search || null;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await studentService.getStudents(course_id, search, page, limit);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', authMiddleware, validate(schemas.students.create), async (req, res) => {
    try {
        const student = await studentService.createStudent(req.body);
        return res.status(201).json(student);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.get('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const student = await studentService.getStudentById(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        return res.json(student);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.students.update), async (req, res) => {
    try {
        const student = await studentService.updateStudent(req.params.id, req.body);
        return res.json(student);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.put('/:id/with-courses', authMiddleware, validateParams(schemas.params.id), validate(schemas.students.updateWithCourses), async (req, res) => {
    try {
        const student = await studentService.updateStudentWithCourses(req.params.id, req.body);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        return res.json(student);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        await studentService.deleteStudent(req.params.id);
        return res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/bulk', authMiddleware, validate(schemas.students.bulkImport), async (req, res) => {
    try {
        const result = await studentService.bulkImportStudents(req.body);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/:id/courses', authMiddleware, validateParams(schemas.params.id), validate(schemas.students.enroll), async (req, res) => {
    try {
        const result = await studentService.enrollStudent(req.params.id, req.body.course_ids);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/:id/courses/all', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const result = await studentService.enrollStudentInAll(req.params.id);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/courses/:courseId', authMiddleware, async (req, res) => {
    try {
        const result = await studentService.removeStudentFromCourse(req.params.id, parseInt(req.params.courseId));
        return res.json(result || { message: 'Removed from course' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id/courses', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const courses = await studentService.getStudentCourses(req.params.id);
        return res.json(courses);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
