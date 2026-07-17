require('dotenv').config();
const { Pool } = require('pg');

async function main() {
    console.log('Connecting to database...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        console.log('Updating students where is_active is NULL to true...');
        const updateRes = await pool.query('UPDATE students SET is_active = true WHERE is_active IS NULL');
        console.log(`Updated ${updateRes.rowCount} rows.`);
        
        const res = await pool.query('SELECT * FROM students');
        console.log('Students in database after update:', res.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

main();
