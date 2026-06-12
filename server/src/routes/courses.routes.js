const express = require('express');
const router = express.Router();
const courseService = require('../services/course.service');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const courses = await courseService.getCourses(userId);
        return res.json(courses);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { course_id, course_name, teacher_name, teacher_initials, default_platform_ids } = req.body;
        if (!course_id || !course_name || !teacher_name || !teacher_initials) {
            return res.status(400).json({ error: 'All course fields are required' });
        }
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

router.get('/:id', authMiddleware, async (req, res) => {
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

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { course_id, course_name, teacher_name, teacher_initials, default_platform_ids } = req.body;
        if (!course_id || !course_name || !teacher_name || !teacher_initials) {
            return res.status(400).json({ error: 'All course fields are required' });
        }
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

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await courseService.deleteCourse(req.params.id);
        return res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

const adminMiddleware = require('../middleware/admin.middleware');

router.get('/:id/members', authMiddleware, async (req, res) => {
    try {
        const members = await courseService.getMembers(req.params.id);
        return res.json(members);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/:id/members', adminMiddleware, async (req, res) => {
    try {
        const { userId, role } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const member = await courseService.assignMember(req.params.id, userId, role);
        return res.json(member);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/members/:userId', adminMiddleware, async (req, res) => {
    try {
        await courseService.removeMember(req.params.id, req.params.userId);
        return res.json({ message: 'Member removed successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Set default platforms for a course
router.put('/:id/default-platforms', authMiddleware, async (req, res) => {
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
