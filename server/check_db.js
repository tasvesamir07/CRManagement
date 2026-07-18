require('dotenv').config();
const { Pool } = require('pg');

async function main() {
    console.log('Connecting to database...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        console.log('Cleaning up duplicate attendance records...');
        const deleteRes = await pool.query(`
            DELETE FROM attendance a
            WHERE a.id < (
                SELECT MAX(b.id)
                FROM attendance b
                WHERE a.student_id = b.student_id
                  AND a.course_id = b.course_id
                  AND a.date = b.date
                  AND (a.exam_routine_id = b.exam_routine_id OR (a.exam_routine_id IS NULL AND b.exam_routine_id IS NULL))
            )
        `);
        console.log(`Deleted ${deleteRes.rowCount} duplicate rows.`);
        
        const countRes = await pool.query('SELECT COUNT(*) FROM attendance');
        console.log('Total attendance rows after cleanup:', countRes.rows[0].count);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

main();
