const db = require('../config/database');

async function createCourse({ course_id, course_name, teacher_name, teacher_initials, created_by }) {
    const result = await db.query(
        'INSERT INTO courses (course_id, course_name, teacher_name, teacher_initials, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [course_id, course_name, teacher_name, teacher_initials, created_by]
    );
    const newCourse = result.rows[0];
    
    // Automatically assign the creator as a lead member
    if (newCourse && created_by) {
        await db.query(
            'INSERT INTO course_members (user_id, course_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [created_by, newCourse.id, 'lead']
        );
    }
    
    return newCourse;
}

async function getCourses(userId) {
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

    for (const course of courses) {
        const members = await getMembers(course.id);
        course.member_count = members.length;
    }

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

async function updateCourse(id, { course_id, course_name, teacher_name, teacher_initials }) {
    const result = await db.query(
        'UPDATE courses SET course_id=$1, course_name=$2, teacher_name=$3, teacher_initials=$4 WHERE id=$5 RETURNING *',
        [course_id, course_name, teacher_name, teacher_initials, id]
    );
    return result.rows[0];
}

async function deleteCourse(id) {
    // Soft delete
    const result = await db.query('UPDATE courses SET is_active = false WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
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
    return result.rows[0];
}

async function removeMember(courseId, userId) {
    const result = await db.query(
        'DELETE FROM course_members WHERE course_id = $1 AND user_id = $2 RETURNING *',
        [courseId, userId]
    );
    return result.rows[0];
}

module.exports = {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getMembers,
    assignMember,
    removeMember
};
