const db = require('../config/database');

async function createRoutine({ course_id, day_of_week, start_time, end_time, room_number, section }) {
    const result = await db.query(
        'INSERT INTO routines (course_id, day_of_week, start_time, end_time, room_number, section) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [course_id, day_of_week, start_time, end_time, room_number, section || '']
    );
    return result.rows[0];
}

async function getRoutines(courseId = null, userId = null) {
    let queryText = 'SELECT r.*, c.course_id as c_id, c.course_name FROM routines r JOIN courses c ON r.course_id = c.id WHERE r.is_active = true';
    const params = [];
    let paramIndex = 1;
    
    if (courseId) {
        queryText += ` AND r.course_id = $${paramIndex++}`;
        params.push(courseId);
    }

    if (userId) {
        queryText += ` AND c.id IN (SELECT course_id FROM course_members WHERE user_id = $${paramIndex++})`;
        params.push(userId);
    }
    
    queryText += ' ORDER BY CASE day_of_week \
        WHEN \'Monday\' THEN 1 \
        WHEN \'Tuesday\' THEN 2 \
        WHEN \'Wednesday\' THEN 3 \
        WHEN \'Thursday\' THEN 4 \
        WHEN \'Friday\' THEN 5 \
        WHEN \'Saturday\' THEN 6 \
        WHEN \'Sunday\' THEN 7 \
        END ASC, start_time ASC';
        
    const result = await db.query(queryText, params);
    return result.rows;
}

async function updateRoutine(id, { course_id, day_of_week, start_time, end_time, room_number, section }) {
    const result = await db.query(
        'UPDATE routines SET course_id=$1, day_of_week=$2, start_time=$3, end_time=$4, room_number=$5, section=$6 WHERE id=$7 RETURNING *',
        [course_id, day_of_week, start_time, end_time, room_number, section || '', id]
    );
    return result.rows[0];
}

async function deleteRoutine(id) {
    const result = await db.query('DELETE FROM routines WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
}

module.exports = {
    createRoutine,
    getRoutines,
    updateRoutine,
    deleteRoutine
};
