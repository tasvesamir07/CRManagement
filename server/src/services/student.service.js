const db = require('../config/database');

function sortStudentIds(students) {
    return students.sort((a, b) => {
        const aIsNumeric = /^\d+$/.test(a.student_id);
        const bIsNumeric = /^\d+$/.test(b.student_id);
        if (aIsNumeric && !bIsNumeric) return -1;
        if (!aIsNumeric && bIsNumeric) return 1;
        if (aIsNumeric && bIsNumeric) return parseInt(a.student_id, 10) - parseInt(b.student_id, 10);
        return a.student_id.localeCompare(b.student_id);
    });
}

async function getStudents(courseId = null, search = null, page = 1, limit = 50) {
    const conditions = ['s.is_active = true'];
    const params = [];
    let paramIndex = 1;

    if (courseId) {
        conditions.push(`s.id IN (SELECT student_id FROM student_courses WHERE course_id = $${paramIndex++})`);
        params.push(courseId);
    }

    if (search) {
        conditions.push(`(s.student_id ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM students s ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const result = await db.query(
        `SELECT s.* FROM students s ${whereClause} ORDER BY CASE WHEN s.student_id ~ '^\\d+$' THEN 0 ELSE 1 END, CASE WHEN s.student_id ~ '^\\d+$' THEN s.student_id::int ELSE 0 END, s.student_id LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );

    return { rows: result.rows, total, page, limit };
}

async function getStudentById(id) {
    const result = await db.query('SELECT * FROM students WHERE id = $1 AND is_active = true', [id]);
    return result.rows[0] || null;
}

async function getStudentByStudentId(studentId) {
    const result = await db.query('SELECT * FROM students WHERE student_id = $1 AND is_active = true', [studentId]);
    return result.rows[0] || null;
}

async function createStudent({ student_id, name, email, phone, batch, section }) {
    const sanitizedId = (student_id || '').trim();
    const sanitizedName = (name || '').trim();
    const sanitizedEmail = (email || '').trim();
    const sanitizedPhone = (phone || '').trim();
    const sanitizedBatch = (batch || '').trim();
    const sanitizedSection = (section || '').trim();

    const result = await db.query(
        'INSERT INTO students (student_id, name, email, phone, batch, section, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *',
        [sanitizedId, sanitizedName, sanitizedEmail, sanitizedPhone, sanitizedBatch, sanitizedSection]
    );
    return result.rows[0];
}

function buildStudentUpdateQuery(id, { student_id, name, email, phone, batch, section, is_active }) {
    const setClauses = ['student_id=$1', 'name=$2', 'email=$3', 'phone=$4', 'batch=$5', 'section=$6'];
    const values = [
        (student_id || '').trim(), (name || '').trim(), (email || '').trim(),
        (phone || '').trim(), (batch || '').trim(), (section || '').trim()
    ];

    if (is_active !== undefined) {
        setClauses.push(`is_active=$${values.length + 1}`);
        values.push(is_active);
    }

    values.push(id);
    return {
        text: `UPDATE students SET ${setClauses.join(', ')} WHERE id=$${values.length} RETURNING *`,
        values
    };
}

async function updateStudent(id, data) {
    const { text, values } = buildStudentUpdateQuery(id, data);
    const result = await db.query(text, values);
    return result.rows[0] || null;
}

async function deleteStudent(id) {
    const result = await db.query('UPDATE students SET is_active = false WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
}

async function bulkImportStudents({ students, course_ids, enroll_all }) {
    const created = [];
    const errors = [];

    for (const student of students) {
        try {
            const sanitizedId = (student.student_id || '').trim();
            const sanitizedName = (student.name || '').trim();
            const sanitizedEmail = (student.email || '').trim();
            const sanitizedPhone = (student.phone || '').trim();
            const sanitizedBatch = (student.batch || '').trim();
            const sanitizedSection = (student.section || '').trim();

            const result = await db.query(
                'INSERT INTO students (student_id, name, email, phone, batch, section, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) ON CONFLICT (student_id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, phone=EXCLUDED.phone, batch=EXCLUDED.batch, section=EXCLUDED.section, is_active=true RETURNING *',
                [sanitizedId, sanitizedName, sanitizedEmail, sanitizedPhone, sanitizedBatch, sanitizedSection]
            );
            created.push(result.rows[0]);
        } catch (err) {
            errors.push({ student: student.student_id, error: err.message });
        }
    }

    if (created.length > 0) {
        const createdIds = created.map(s => s.id);

        let targetCourseIds = [];
        if (enroll_all) {
            const coursesResult = await db.query('SELECT id FROM courses WHERE is_active = true');
            targetCourseIds = coursesResult.rows.map(c => c.id);
        } else if (course_ids && course_ids.length > 0) {
            targetCourseIds = course_ids;
        }

        if (targetCourseIds.length > 0) {
            for (const studentId of createdIds) {
                for (const courseId of targetCourseIds) {
                    await db.query(
                        'INSERT INTO student_courses (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [studentId, courseId]
                    );
                }
            }
        }
    }

    return { created, errors };
}

async function enrollStudent(studentId, courseIds) {
    const results = [];
    for (const courseId of courseIds) {
        const result = await db.query(
            'INSERT INTO student_courses (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [studentId, courseId]
        );
        if (result.rows[0]) {
            results.push(result.rows[0]);
        }
    }
    return results;
}

async function enrollStudentInAll(studentId) {
    const coursesResult = await db.query('SELECT id FROM courses WHERE is_active = true');
    const courseIds = coursesResult.rows.map(c => c.id);
    return enrollStudent(studentId, courseIds);
}

async function removeStudentFromCourse(studentId, courseId) {
    const result = await db.query(
        'DELETE FROM student_courses WHERE student_id = $1 AND course_id = $2 RETURNING *',
        [studentId, courseId]
    );
    return result.rows[0] || null;
}

async function getStudentCourses(studentId) {
    const result = await db.query(
        'SELECT c.* FROM courses c JOIN student_courses sc ON c.id = sc.course_id WHERE sc.student_id = $1 AND c.is_active = true ORDER BY c.course_id ASC',
        [studentId]
    );
    return result.rows;
}

async function updateStudentWithCourses(id, { course_ids, ...studentData }) {
    const client = await db.getClient();
    if (client) {
        try {
            await client.query('BEGIN');

            const { text, values } = buildStudentUpdateQuery(id, studentData);
            const studentResult = await client.query(text, values);

            if (course_ids !== undefined && Array.isArray(course_ids)) {
                const currentCourses = await client.query(
                    'SELECT course_id FROM student_courses WHERE student_id = $1', [id]
                );
                const currentIds = currentCourses.rows.map(r => r.course_id);

                const toAdd = course_ids.filter(cid => !currentIds.includes(cid));
                const toRemove = currentIds.filter(cid => !course_ids.includes(cid));

                for (const cid of toAdd) {
                    await client.query(
                        'INSERT INTO student_courses (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [id, cid]
                    );
                }
                for (const cid of toRemove) {
                    await client.query(
                        'DELETE FROM student_courses WHERE student_id = $1 AND course_id = $2',
                        [id, cid]
                    );
                }
            }

            await client.query('COMMIT');
            return studentResult.rows[0] || null;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Fallback: JSON DB mode — non-atomic
    const student = await updateStudent(id, studentData);
    if (course_ids !== undefined && Array.isArray(course_ids) && student) {
        const currentCourses = await getStudentCourses(id);
        const currentIds = currentCourses.map(c => c.id);

        const toAdd = course_ids.filter(cid => !currentIds.includes(cid));
        const toRemove = currentIds.filter(cid => !course_ids.includes(cid));

        for (const cid of toAdd) {
            await enrollStudent(id, [cid]);
        }
        for (const cid of toRemove) {
            await removeStudentFromCourse(id, cid);
        }
    }
    return student;
}

module.exports = {
    getStudents,
    getStudentById,
    getStudentByStudentId,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkImportStudents,
    enrollStudent,
    enrollStudentInAll,
    removeStudentFromCourse,
    getStudentCourses,
    sortStudentIds,
    updateStudentWithCourses
};
