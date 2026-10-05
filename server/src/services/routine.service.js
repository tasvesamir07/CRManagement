const db = require('../config/database');
const cache = require('../config/cache');

async function createRoutine({ course_id, day_of_week, start_time, end_time, room_number, section }) {
    const result = await db.query(
        'INSERT INTO routines (course_id, day_of_week, start_time, end_time, room_number, section) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [course_id, day_of_week, start_time, end_time, room_number, section || '']
    );
    cache.invalidatePattern('routines:');
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
    cache.invalidatePattern('routines:');
    return result.rows[0];
}

async function deleteRoutine(id) {
    const result = await db.query(
        'UPDATE routines SET is_active = false WHERE id = $1 RETURNING *',
        [id]
    );
    cache.invalidatePattern('routines:');
    return result.rows[0];
}

async function moveRoutine(routineId, targetFolderId) {
    const parsedFolderId = targetFolderId ? parseInt(targetFolderId) : null;
    const result = await db.query(
        'UPDATE routines SET course_id = $1 WHERE id = $2 RETURNING *',
        [parsedFolderId, routineId]
    );
    const updated = result.rows[0];
    if (updated) {
        cache.invalidatePattern('routines:');
    }
    return updated;
}

async function copyRoutine(routineId, targetFolderId) {
    const parsedFolderId = targetFolderId ? parseInt(targetFolderId) : null;

    // Get original routine details
    const original = await db.query('SELECT * FROM routines WHERE id = $1 AND is_active = true', [routineId]);
    if (original.rows.length === 0) {
        throw new Error('Routine not found');
    }
    const orig = original.rows[0];

    // Generate new routine ID
    let newRoutineId = `${orig.c_id}-COPY`;

    // Check if new ID already exists
    const exists = await db.query('SELECT id FROM routines WHERE c_id = $1 AND is_active = true', [newRoutineId]);
    if (exists.rows.length > 0) {
        // Try with sequential number
        for (let i = 1; i <= 100; i++) {
            const testId = `${orig.c_id}-COPY-${i}`;
            const testExists = await db.query('SELECT id FROM routines WHERE c_id = $1 AND is_active = true', [testId]);
            if (testExists.rows.length === 0) {
                newRoutineId = testId;
                break;
            }
        }
    }

    // Create new routine with copied data
    const result = await db.query(
        `INSERT INTO routines (course_id, c_id, day_of_week, start_time, end_time, room_number, section, is_active, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8) RETURNING *`,
        [parsedFolderId || orig.course_id, newRoutineId, orig.day_of_week, orig.start_time, orig.end_time, orig.room_number, orig.section, orig.created_by]
    );

    const newRoutine = result.rows[0];
    cache.invalidatePattern('routines:');
    return newRoutine;
}

async function listFolders(userId) {
    const courseService = require('./course.service');
    return await courseService.listFolders(userId);
}

module.exports = {
    createRoutine,
    getRoutines,
    updateRoutine,
    deleteRoutine,
    moveRoutine,
    copyRoutine,
    listFolders
};
