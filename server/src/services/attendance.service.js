const db = require('../config/database');

async function getAttendance(courseId, date, examRoutineId = null, page = 1, limit = 100) {
    const params = [courseId, date];
    let paramIndex = 3;
    let examFilter = 'AND a.exam_routine_id IS NULL';
    if (examRoutineId) {
        examFilter = `AND a.exam_routine_id = $${paramIndex++}`;
        params.push(examRoutineId);
    }

    const countResult = await db.query(
        `SELECT COUNT(*) FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.course_id = $1 AND a.date = $2 ${examFilter}`,
        params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);
    const result = await db.query(
        `SELECT a.id, a.course_id, a.exam_routine_id, a.date, a.status, a.marked_by, a.marked_at, a.notes,
                s.student_id, s.name, s.section, s.batch
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         WHERE a.course_id = $1 AND a.date = $2 ${examFilter}
         ORDER BY CASE WHEN s.student_id ~ '^\\d+$' THEN 0 ELSE 1 END,
                  CASE WHEN s.student_id ~ '^\\d+$' THEN s.student_id::int ELSE 0 END,
                  s.student_id
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
    );

    return { rows: result.rows, total, page, limit };
}

async function getAttendanceForCourseDate(courseId, date, examRoutineId = null) {
    const params = [courseId, date];
    let examFilter = 'AND a.exam_routine_id IS NULL';
    let absentExamFilter = 'AND att.exam_routine_id IS NULL';
    if (examRoutineId) {
        examFilter = 'AND a.exam_routine_id = $3';
        absentExamFilter = 'AND att.exam_routine_id = $3';
        params.push(examRoutineId);
    }

    const attendanceResult = await db.query(
        `SELECT a.id, a.course_id, a.exam_routine_id, a.date, a.status, a.marked_by, a.marked_at, a.notes,
                s.student_id, s.name, s.section, s.batch
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         WHERE a.course_id = $1 AND a.date = $2 ${examFilter}
         ORDER BY CASE WHEN s.student_id ~ '^\\d+$' THEN 0 ELSE 1 END,
                  CASE WHEN s.student_id ~ '^\\d+$' THEN s.student_id::int ELSE 0 END,
                  s.student_id`,
        params
    );

    const absentResult = await db.query(
        `SELECT s.id, s.student_id, s.name, s.section, s.batch
         FROM student_courses sc
         JOIN students s ON s.id = sc.student_id AND s.is_active = true
         WHERE sc.course_id = $1
           AND NOT EXISTS (
               SELECT 1 FROM attendance att
               WHERE att.student_id = s.id
                 AND att.course_id = sc.course_id
                 AND att.date = $2
                 ${absentExamFilter}
           )
         ORDER BY CASE WHEN s.student_id ~ '^\\d+$' THEN 0 ELSE 1 END,
                  CASE WHEN s.student_id ~ '^\\d+$' THEN s.student_id::int ELSE 0 END,
                  s.student_id`,
        params
    );

    return { attendance: attendanceResult.rows, absent: absentResult.rows };
}

async function bulkMarkAttendance({ course_id, date, exam_routine_id, records }, userId) {
    const results = [];

    for (const record of records) {
        const result = await db.query(
            `INSERT INTO attendance (student_id, course_id, date, exam_routine_id, status, marked_by, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (student_id, course_id, date, exam_routine_id)
             DO UPDATE SET
                 status = EXCLUDED.status,
                 marked_by = EXCLUDED.marked_by,
                 marked_at = NOW(),
                 notes = EXCLUDED.notes
             RETURNING *`,
            [record.student_id, course_id, date, exam_routine_id || null, record.status, userId, record.notes || null]
        );
        results.push(result.rows[0]);
    }

    return results;
}

async function updateAttendance(id, { status, notes }) {
    const result = await db.query(
        'UPDATE attendance SET status = $1, notes = $2, marked_at = NOW() WHERE id = $3 RETURNING *',
        [status, notes || null, id]
    );
    return result.rows[0] || null;
}

async function deleteAttendance(id) {
    const result = await db.query(
        'DELETE FROM attendance WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0] || null;
}

async function getAttendanceSummary(studentId, courseId = null) {
    const conditions = ['student_id = $1'];
    const params = [studentId];
    if (courseId) {
        conditions.push('course_id = $2');
        params.push(courseId);
    }

    const result = await db.query(
        `SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'present') AS present
         FROM attendance
         WHERE ${conditions.join(' AND ')}`,
        params
    );

    const { total, present } = result.rows[0];
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total: parseInt(total, 10), present: parseInt(present, 10), percentage };
}

async function getEnrolledStudentsWithAttendance(courseId, date, examRoutineId = null) {
    const params = [courseId, date];
    let examJoin = '(a.exam_routine_id IS NULL OR a.exam_routine_id IS NOT NULL)';
    if (examRoutineId) {
        examJoin = 'a.exam_routine_id = $3';
        params.push(examRoutineId);
    } else {
        examJoin = 'a.exam_routine_id IS NULL';
    }

    const result = await db.query(
        `SELECT s.id, s.student_id, s.name, s.section, s.batch,
                a.id AS attendance_id, a.status, a.notes
         FROM student_courses sc
         JOIN students s ON s.id = sc.student_id AND s.is_active = true
         LEFT JOIN attendance a ON a.student_id = s.id
             AND a.course_id = sc.course_id
             AND a.date = $2
             AND ${examJoin}
         WHERE sc.course_id = $1
         ORDER BY CASE WHEN s.student_id ~ '^\\d+$' THEN 0 ELSE 1 END,
                  CASE WHEN s.student_id ~ '^\\d+$' THEN s.student_id::int ELSE 0 END,
                  s.student_id`,
        params
    );

    return result.rows;
}

async function getPresentStudents(courseId, date, examRoutineId = null) {
    const params = [courseId, date];
    let examFilter = 'AND a.exam_routine_id IS NULL';
    if (examRoutineId) {
        examFilter = 'AND a.exam_routine_id = $3';
        params.push(examRoutineId);
    }

    const result = await db.query(
        `SELECT a.id, a.course_id, a.exam_routine_id, a.date, a.status, a.marked_by, a.marked_at, a.notes,
                s.student_id, s.name, s.section, s.batch
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         WHERE a.course_id = $1 AND a.date = $2 AND a.status = 'present' ${examFilter}
         ORDER BY CASE WHEN s.student_id ~ '^\\d+$' THEN 0 ELSE 1 END,
                  CASE WHEN s.student_id ~ '^\\d+$' THEN s.student_id::int ELSE 0 END,
                  s.student_id`,
        params
    );

    return result.rows;
}

module.exports = {
    getAttendance,
    getAttendanceForCourseDate,
    bulkMarkAttendance,
    updateAttendance,
    deleteAttendance,
    getAttendanceSummary,
    getEnrolledStudentsWithAttendance,
    getPresentStudents
};
