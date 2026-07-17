const express = require('express');
const router = express.Router();
const studentService = require('../services/student.service');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { validate, validateParams, validateQuery, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /students:
 *   get:
 *     tags: [Students]
 *     summary: List all students
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated list of students
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { course_id, search, page = 1, limit = 50 } = req.query;
        const userId = req.user.role !== 'admin' ? req.user.id : null;
        const students = await studentService.getStudents({ course_id, search, page: Number(page), limit: Number(limit), userId });
        return res.json(students);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students:
 *   post:
 *     tags: [Students]
 *     summary: Create a new student
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Student created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, validate(schemas.students.create), async (req, res) => {
    try {
        const student = await studentService.createStudent(req.body);
        return res.status(201).json(student);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get a student by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student object
 *       404:
 *         description: Student not found
 */
router.get('/:id', authMiddleware, validateParams(schemas.params.studentId), async (req, res) => {
    try {
        const student = await studentService.getStudentById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        return res.json(student);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/{id}:
 *   put:
 *     tags: [Students]
 *     summary: Update a student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Student updated
 *       400:
 *         description: Validation error
 */
router.put('/:id', authMiddleware, validateParams(schemas.params.studentId), validate(schemas.students.update), async (req, res) => {
    try {
        const student = await studentService.updateStudent(req.params.id, req.body);
        return res.json(student);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/{id}:
 *   delete:
 *     tags: [Students]
 *     summary: Soft delete a student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.studentId), async (req, res) => {
    try {
        await studentService.deleteStudent(req.params.id);
        return res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/bulk:
 *   post:
 *     tags: [Students]
 *     summary: Bulk import students
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Students imported
 *       400:
 *         description: Validation error
 */
router.post('/bulk', authMiddleware, validate(schemas.students.bulkImport), async (req, res) => {
    try {
        const result = await studentService.bulkImport(req.body);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/{id}/courses:
 *   post:
 *     tags: [Students]
 *     summary: Enroll student in specific courses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Student enrolled
 *       400:
 *         description: Validation error
 */
router.post('/:id/courses', authMiddleware, validateParams(schemas.params.studentId), validate(schemas.students.enroll), async (req, res) => {
    try {
        const result = await studentService.enrollCourses(req.params.id, req.body);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/{id}/courses/all:
 *   post:
 *     tags: [Students]
 *     summary: Enroll student in all active courses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student enrolled in all courses
 */
router.post('/:id/courses/all', authMiddleware, validateParams(schemas.params.studentId), async (req, res) => {
    try {
        const result = await studentService.enrollAllCourses(req.params.id);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/{id}/courses/{courseId}:
 *   delete:
 *     tags: [Students]
 *     summary: Remove student from a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Student removed from course
 */
router.delete('/:id/courses/:courseId', authMiddleware, validateParams(schemas.params.studentId), async (req, res) => {
    try {
        const result = await studentService.removeCourse(req.params.id, req.params.courseId);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /students/{id}/courses:
 *   get:
 *     tags: [Students]
 *     summary: Get student's enrolled courses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Array of enrolled courses
 */
router.get('/:id/courses', authMiddleware, validateParams(schemas.params.studentId), async (req, res) => {
    try {
        const courses = await studentService.getEnrolledCourses(req.params.id);
        return res.json(courses);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
