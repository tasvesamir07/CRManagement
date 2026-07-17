const express = require('express');
const router = express.Router();
const courseService = require('../services/course.service');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /courses:
 *   get:
 *     tags: [Courses]
 *     summary: List all courses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of courses
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const courses = await courseService.getCourses(userId);
        return res.json(courses);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create a new course
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
 *                 type: string
 *               course_name:
 *                 type: string
 *               teacher_name:
 *                 type: string
 *               teacher_initials:
 *                 type: string
 *               default_platform_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Course created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, validate(schemas.courses.create), async (req, res) => {
    try {
        const { course_id, course_name, teacher_name, teacher_initials, default_platform_ids } = req.body;
        const course = await courseService.createCourse({
            course_id,
            course_name,
            teacher_name,
            teacher_initials,
            created_by: req.user.id,
            default_platform_ids
        });
        return res.status(201).json(course);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Get a course by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course object
 *       404:
 *         description: Course not found
 */
router.get('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const course = await courseService.getCourseById(req.params.id);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        return res.json(course);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses/{id}:
 *   put:
 *     tags: [Courses]
 *     summary: Update a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               course_id:
 *                 type: string
 *               course_name:
 *                 type: string
 *               teacher_name:
 *                 type: string
 *               teacher_initials:
 *                 type: string
 *               default_platform_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Course updated
 *       400:
 *         description: Validation error
 */
router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.courses.update), async (req, res) => {
    try {
        const { course_id, course_name, teacher_name, teacher_initials, default_platform_ids } = req.body;
        const course = await courseService.updateCourse(req.params.id, {
            course_id,
            course_name,
            teacher_name,
            teacher_initials,
            default_platform_ids
        });
        return res.json(course);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses/{id}:
 *   delete:
 *     tags: [Courses]
 *     summary: Delete a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        await courseService.deleteCourse(req.params.id);
        return res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses/{id}/members:
 *   get:
 *     tags: [Courses]
 *     summary: Get members of a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Array of course members
 */
router.get('/:id/members', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const members = await courseService.getMembers(req.params.id);
        return res.json(members);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses/{id}/members:
 *   post:
 *     tags: [Courses]
 *     summary: Assign a member to a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member assigned
 *       400:
 *         description: Validation error
 */
router.post('/:id/members', adminMiddleware, validateParams(schemas.params.id), validate(schemas.courses.assignMember), async (req, res) => {
    try {
        const { user_id, role } = req.body;
        const member = await courseService.assignMember(req.params.id, user_id, role);
        return res.json(member);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses/{id}/members/{userId}:
 *   delete:
 *     tags: [Courses]
 *     summary: Remove a member from a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete('/:id/members/:userId', adminMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        await courseService.removeMember(req.params.id, req.params.userId);
        return res.json({ message: 'Member removed successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /courses/{id}/default-platforms:
 *   put:
 *     tags: [Courses]
 *     summary: Set default platforms for a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Default platforms updated
 *       400:
 *         description: Validation error
 */
router.put('/:id/default-platforms', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const { platform_ids } = req.body;
        if (!Array.isArray(platform_ids)) {
            return res.status(400).json({ error: 'platform_ids must be an array' });
        }
        const course = await courseService.setDefaultPlatforms(req.params.id, platform_ids, req.user.id, req.user.role);
        return res.json(course);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

module.exports = router;
