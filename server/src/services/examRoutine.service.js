const db = require('../config/database');

async function getExamRoutines(courseId = null, examType = null, dateFrom = null, dateTo = null, userId = null) {
    let queryText = 'SELECT er.*, c.course_id, c.course_name FROM exam_routines er JOIN courses c ON er.course_id = c.id WHERE er.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (courseId) {
        queryText += ` AND er.course_id = $${paramIndex++}`;
        params.push(courseId);
    }

    if (examType) {
        queryText += ` AND er.exam_type = $${paramIndex++}`;
        params.push(examType);
    }

    if (dateFrom) {
        queryText += ` AND er.exam_date >= $${paramIndex++}`;
        params.push(dateFrom);
    }

    if (dateTo) {
        queryText += ` AND er.exam_date <= $${paramIndex++}`;
        params.push(dateTo);
    }

    if (userId) {
        queryText += ` AND (c.id IN (SELECT course_id FROM course_members WHERE user_id = $${paramIndex++})`;
        params.push(userId);
        queryText += ` OR er.created_by = $${paramIndex++})`;
        params.push(userId);
    }

    queryText += ' ORDER BY er.exam_date ASC, er.start_time ASC';

    const result = await db.query(queryText, params);
    return result.rows;
}

async function getExamRoutineById(id) {
    const result = await db.query(
        'SELECT er.*, c.course_id, c.course_name FROM exam_routines er JOIN courses c ON er.course_id = c.id WHERE er.id = $1 AND er.is_active = true',
        [id]
    );
    return result.rows[0];
}

async function createExamRoutine({ course_id, exam_type, exam_date, start_time, end_time, room_number, section, instructions, canva_template_id }) {
    const result = await db.query(
        'INSERT INTO exam_routines (course_id, exam_type, exam_date, start_time, end_time, room_number, section, instructions, canva_template_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [course_id, exam_type, exam_date, start_time, end_time, room_number, section || '', instructions || '', canva_template_id || null]
    );
    return result.rows[0];
}

async function updateExamRoutine(id, { course_id, exam_type, exam_date, start_time, end_time, room_number, section, instructions, canva_template_id, is_active }) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (course_id !== undefined) { fields.push(`course_id = $${paramIndex++}`); params.push(course_id); }
    if (exam_type !== undefined) { fields.push(`exam_type = $${paramIndex++}`); params.push(exam_type); }
    if (exam_date !== undefined) { fields.push(`exam_date = $${paramIndex++}`); params.push(exam_date); }
    if (start_time !== undefined) { fields.push(`start_time = $${paramIndex++}`); params.push(start_time); }
    if (end_time !== undefined) { fields.push(`end_time = $${paramIndex++}`); params.push(end_time); }
    if (room_number !== undefined) { fields.push(`room_number = $${paramIndex++}`); params.push(room_number); }
    if (section !== undefined) { fields.push(`section = $${paramIndex++}`); params.push(section); }
    if (instructions !== undefined) { fields.push(`instructions = $${paramIndex++}`); params.push(instructions); }
    if (canva_template_id !== undefined) { fields.push(`canva_template_id = $${paramIndex++}`); params.push(canva_template_id); }
    if (is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); params.push(is_active); }

    params.push(id);
    const queryText = `UPDATE exam_routines SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(queryText, params);
    return result.rows[0];
}

async function deleteExamRoutine(id) {
    const result = await db.query('UPDATE exam_routines SET is_active = false WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
}

module.exports = {
    getExamRoutines,
    getExamRoutineById,
    createExamRoutine,
    updateExamRoutine,
    deleteExamRoutine
};
