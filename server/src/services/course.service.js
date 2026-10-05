const db = require('../config/database');
const cache = require('../config/cache');

async function createCourse({ course_id, course_name, teacher_name, teacher_initials, created_by, default_platform_ids }) {
    // Trim and sanitize input values to remove tab characters and multiple whitespaces
    const sanitizedId = (course_id || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const sanitizedName = (course_name || '').trim().replace(/\s+/g, ' ');
    const sanitizedTeacherName = (teacher_name || '').trim().replace(/\s+/g, ' ');
    const sanitizedTeacherInitials = (teacher_initials || '').trim().replace(/\s+/g, ' ').toUpperCase();

    const result = await db.query(
        'INSERT INTO courses (course_id, course_name, teacher_name, teacher_initials, created_by, default_platform_ids) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [sanitizedId, sanitizedName, sanitizedTeacherName, sanitizedTeacherInitials, created_by, default_platform_ids || []]
    );
    const newCourse = result.rows[0];
    
    // Automatically assign the creator as a lead member
    if (newCourse && created_by) {
        await db.query(
            'INSERT INTO course_members (user_id, course_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [created_by, newCourse.id, 'lead']
        );
    }
    
    // Automatically create a folder for the course when it is created
    if (newCourse) {
        const folderName = `${newCourse.course_id} - ${newCourse.course_name}`;
        const fileService = require('./file.service');
        await fileService.createFolder(folderName, newCourse.id, created_by || null);
    }
    
    if (newCourse) {
        cache.invalidatePattern('courses:');
    }
    
    return newCourse;
}

async function getCourses(userId) {
    const cacheKey = `courses:${userId || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    let query;
    const params = [];
    if (userId) {
        query = 'SELECT c.* FROM courses c JOIN course_members cm ON c.id = cm.course_id WHERE cm.user_id = $1 AND c.is_active = true ORDER BY c.course_id ASC';
        params.push(userId);
    } else {
        query = 'SELECT * FROM courses WHERE is_active = true ORDER BY course_id ASC';
    }
    const result = await db.query(query, params);
    const courses = result.rows;

    if (courses.length > 0) {
        const courseIds = courses.map(c => c.id);
        const countResult = await db.query(
            'SELECT course_id, COUNT(*) as count FROM course_members WHERE course_id = ANY($1) GROUP BY course_id',
            [courseIds]
        );
        const countsMap = {};
        countResult.rows.forEach(row => {
            countsMap[row.course_id] = parseInt(row.count);
        });
        courses.forEach(course => {
            course.member_count = countsMap[course.id] || 0;
        });
    }

    cache.set(cacheKey, courses, 60); // 60s TTL
    return courses;
}

async function getCourseById(id) {
    const courseResult = await db.query('SELECT * FROM courses WHERE id = $1 AND is_active = true', [id]);
    if (courseResult.rows.length === 0) {
        return null;
    }
    const course = courseResult.rows[0];
    
    // Fetch routines for this course
    const routineResult = await db.query('SELECT * FROM routines WHERE course_id = $1 AND is_active = true', [id]);
    course.routines = routineResult.rows;
    
    return course;
}

async function setDefaultPlatforms(courseId, platformIds, _userId, _userRole) {
    // Validate platforms exist and are active
    if (platformIds && platformIds.length > 0) {
        const placeholders = platformIds.map((_, i) => `$${i + 1}`).join(',');
        const query = `SELECT id FROM platforms WHERE id IN (${placeholders}) AND is_active = true`;
        const result = await db.query(query, platformIds);
        if (result.rows.length !== platformIds.length) {
            throw new Error('One or more platforms not found or inactive');
        }
    }
    
    const courseResult = await db.query(
        'UPDATE courses SET default_platform_ids = $1 WHERE id = $2 RETURNING *',
        [platformIds || [], courseId]
    );
    
    if (courseResult.rows.length === 0) {
        throw new Error('Course not found');
    }
    
    const updated = courseResult.rows[0];
    if (updated) {
        cache.invalidatePattern('courses:');
    }
    return updated;
}

async function updateCourse(id, { course_id, course_name, teacher_name, teacher_initials, default_platform_ids }) {
    const sanitizedId = (course_id || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const sanitizedName = (course_name || '').trim().replace(/\s+/g, ' ');
    const sanitizedTeacherName = (teacher_name || '').trim().replace(/\s+/g, ' ');
    const sanitizedTeacherInitials = (teacher_initials || '').trim().replace(/\s+/g, ' ').toUpperCase();

    const result = await db.query(
        'UPDATE courses SET course_id=$1, course_name=$2, teacher_name=$3, teacher_initials=$4, default_platform_ids=$5 WHERE id=$6 RETURNING *',
        [sanitizedId, sanitizedName, sanitizedTeacherName, sanitizedTeacherInitials, default_platform_ids || [], id]
    );
    const updated = result.rows[0];
    if (updated) {
        cache.invalidatePattern('courses:');
    }
    return updated;
}

async function deleteCourse(id) {
    // Soft delete
    const result = await db.query('UPDATE courses SET is_active = false WHERE id = $1 RETURNING *', [id]);
    const deleted = result.rows[0];
    if (deleted) {
        cache.invalidatePattern('courses:');
    }
    return deleted;
}

async function getMembers(courseId) {
    const result = await db.query(
        'SELECT u.id, u.username, u.email, u.display_name, cm.role, cm.assigned_at \
         FROM users u \
         JOIN course_members cm ON u.id = cm.user_id \
         WHERE cm.course_id = $1 \
         ORDER BY cm.role DESC, u.username ASC',
        [courseId]
    );
    return result.rows;
}

async function assignMember(courseId, userId, role = 'cr') {
    const result = await db.query(
        'INSERT INTO course_members (user_id, course_id, role) VALUES ($1, $2, $3) \
         ON CONFLICT (user_id, course_id) DO UPDATE SET role = EXCLUDED.role RETURNING *',
        [userId, courseId, role]
    );
    const assigned = result.rows[0];
    if (assigned) {
        cache.invalidatePattern('courses:');
    }
    return assigned;
}

async function listFolders(userId) {
    let isAdmin = false;
    if (userId) {
        const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = userResult.rows[0]?.role;
        if (userRole === 'admin') isAdmin = true;
    }
    const result = await db.query(
        'SELECT fo.*, c.course_name, c.course_id as course_code FROM folders fo LEFT JOIN courses c ON fo.course_id = c.id'
    );
    let filteredFolders = result.rows;
    if (userId && !isAdmin) {
        const { getCourses } = require('./course.service');
        const courses = await getCourses(userId);
        const userCourseIds = courses.map(c => parseInt(c.id));
        filteredFolders = filteredFolders.filter(folder => {
            if (folder.course_id) return userCourseIds.includes(parseInt(folder.course_id));
            return parseInt(folder.created_by) === parseInt(userId);
        });
    }
    filteredFolders.sort((a, b) => a.name.localeCompare(b.name));
    return filteredFolders;
}

async function removeMember(courseId, userId) {
    const result = await db.query(
        'DELETE FROM course_members WHERE course_id = $1 AND user_id = $2 RETURNING *',
        [courseId, userId]
    );
    const removed = result.rows[0];
    if (removed) {
        cache.invalidatePattern('courses:');
    }
    return removed;
}

async function moveCourse(courseId, targetFolderId) {
    const parsedFolderId = targetFolderId ? parseInt(targetFolderId) : null;
    const result = await db.query(
        "UPDATE courses SET course_id = CONCAT(COALESCE((SELECT course_code FROM folders WHERE id = $1), ''), '-MOVED') WHERE id = $2 RETURNING *",
        [parsedFolderId, courseId]
    );
    const updated = result.rows[0];
    if (updated) {
        cache.invalidatePattern('courses:');
    }
    return updated;
}

async function copyCourse(courseId, targetFolderId) {
    const parsedFolderId = targetFolderId ? parseInt(targetFolderId) : null;

    // Get original course details
    const original = await db.query('SELECT * FROM courses WHERE id = $1 AND is_active = true', [courseId]);
    if (original.rows.length === 0) {
        throw new Error('Course not found');
    }
    const orig = original.rows[0];

    // Generate new course ID: original + -COPY suffix
    let newCourseId = `${orig.course_id}-COPY`;

    // Check if new ID already exists
    const exists = await db.query('SELECT id FROM courses WHERE course_id = $1 AND is_active = true', [newCourseId]);
    if (exists.rows.length > 0) {
        // Try with sequential number
        for (let i = 1; i <= 100; i++) {
            const testId = `${orig.course_id}-COPY-${i}`;
            const testExists = await db.query('SELECT id FROM courses WHERE course_id = $1 AND is_active = true', [testId]);
            if (testExists.rows.length === 0) {
                newCourseId = testId;
                break;
            }
        }
    }

    // Create new course with copied data
    const result = await db.query(
        `INSERT INTO courses (course_id, course_name, teacher_name, teacher_initials, is_active, created_by, default_platform_ids) 
         VALUES ($1, $2, $3, $4, true, $5, $6) RETURNING *`,
        [newCourseId, orig.course_name, orig.teacher_name, orig.teacher_initials, orig.created_by, orig.default_platform_ids || []]
    );

    const newCourse = result.rows[0];

    // Associate with target folder if provided
    if (parsedFolderId) {
        await db.query(
            'UPDATE folders SET course_id = $1 WHERE id = $2',
            [newCourse.id, parsedFolderId]
        );
    }

    // Also copy course_members (excluding the creator if needed)
    await db.query(
        `INSERT INTO course_members (user_id, course_id, role) 
         SELECT user_id, $1, role FROM course_members WHERE course_id = $2 AND user_id != $3`,
        [newCourse.id, courseId, orig.created_by]
    );

    cache.invalidatePattern('courses:');
    return newCourse;
}

module.exports = {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getMembers,
    assignMember,
    removeMember,
    listFolders,
    moveCourse,
    copyCourse,
    setDefaultPlatforms
};
