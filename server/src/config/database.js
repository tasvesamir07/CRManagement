const { Pool } = require('pg');
const { initJsonDb } = require('./database/jsonDb');
const { simulateQuery } = require('./database/simulateQuery');
const { getCorrelationId } = require('./requestContext');
const { inc, dbQueryType } = require('../services/metrics.service');

let pool = null;
let useJsonDb = false;
let dbInitError = null;
const isVercel = !!process.env.VERCEL;

// Check database URL config
async function initDatabase() {
    if (process.env.DATABASE_URL) {
        console.log('PostgreSQL database URL detected. Initializing database pool...');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('render')
                ? { rejectUnauthorized: false }
                : false,
            connectionTimeoutMillis: 15000,
            idleTimeoutMillis: 30000,
            max: 10
        });

        const maxRetries = 5;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                attempt++;
                const client = await pool.connect();
                console.log(`✅ PostgreSQL database connected successfully (attempt ${attempt}/${maxRetries}).`);
                
                await client.query(`
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        display_name TEXT,
                        role TEXT DEFAULT 'cr' CHECK (role IN ('cr', 'admin')),
                        is_active BOOLEAN DEFAULT true,
                        two_factor_secret TEXT,
                        two_factor_enabled BOOLEAN DEFAULT false,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS courses (
                        id SERIAL PRIMARY KEY,
                        course_id TEXT NOT NULL,
                        course_name TEXT NOT NULL,
                        teacher_name TEXT,
                        teacher_initials TEXT,
                        created_by INTEGER REFERENCES users(id),
                        default_platform_ids INTEGER[] DEFAULT '{}',
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS routines (
                        id SERIAL PRIMARY KEY,
                        course_id INTEGER REFERENCES courses(id),
                        day_of_week TEXT NOT NULL,
                        start_time TEXT NOT NULL,
                        end_time TEXT NOT NULL,
                        room_number TEXT,
                        section TEXT DEFAULT '',
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS platforms (
                        id SERIAL PRIMARY KEY,
                        platform_name TEXT NOT NULL,
                        platform_type TEXT NOT NULL,
                        chat_id TEXT NOT NULL,
                        description TEXT,
                        created_by INTEGER,
                        course_id INTEGER REFERENCES courses(id),
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_platform_type_check;
                    ALTER TABLE platforms ADD CONSTRAINT platforms_platform_type_check CHECK (platform_type IN ('whatsapp', 'telegram', 'messenger'));
                    CREATE TABLE IF NOT EXISTS folders (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
                        created_by INTEGER,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS files (
                        id SERIAL PRIMARY KEY,
                        original_name TEXT NOT NULL,
                        storage_path TEXT NOT NULL,
                        file_type TEXT,
                        file_size INTEGER,
                        uploaded_by INTEGER,
                        expires_at TIMESTAMPTZ,
                        folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
                        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
                        is_deleted BOOLEAN DEFAULT false
                    );
                    CREATE TABLE IF NOT EXISTS announcements (
                        id SERIAL PRIMARY KEY,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        category TEXT,
                        course_id INTEGER REFERENCES courses(id),
                        custom_room TEXT,
                        custom_time TEXT,
                        file_id INTEGER,
                        file_ids INTEGER[] DEFAULT '{}',
                        created_by INTEGER REFERENCES users(id),
                        status TEXT DEFAULT 'draft',
                        scheduled_at TIMESTAMPTZ,
                        sent_at TIMESTAMPTZ,
                        metadata JSONB,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS announcement_platforms (
                        announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
                        platform_id INTEGER REFERENCES platforms(id),
                        platform_status TEXT DEFAULT 'pending',
                        error_message TEXT,
                        sent_at TIMESTAMPTZ,
                        PRIMARY KEY (announcement_id, platform_id)
                    );
                    CREATE TABLE IF NOT EXISTS course_members (
                        user_id INTEGER REFERENCES users(id),
                        course_id INTEGER REFERENCES courses(id),
                        role TEXT DEFAULT 'cr',
                        assigned_at TIMESTAMPTZ DEFAULT NOW(),
                        PRIMARY KEY (user_id, course_id)
                    );
                    CREATE TABLE IF NOT EXISTS otps (
                        id SERIAL PRIMARY KEY,
                        email TEXT NOT NULL,
                        otp TEXT NOT NULL,
                        type TEXT DEFAULT 'password_reset',
                        expires_at TIMESTAMPTZ NOT NULL,
                        used BOOLEAN DEFAULT false,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER,
                        action TEXT NOT NULL,
                        entity_type TEXT,
                        entity_id INTEGER,
                        details TEXT,
                        ip_address TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS analytics_events (
                        id SERIAL PRIMARY KEY,
                        event_type TEXT NOT NULL,
                        user_id INTEGER,
                        metadata TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS announcement_templates (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        category TEXT DEFAULT 'notice',
                        title_template TEXT NOT NULL,
                        content_template TEXT NOT NULL,
                        variables TEXT[] DEFAULT '{}',
                        is_active BOOLEAN DEFAULT true,
                        created_by INTEGER,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS whatsapp_creds (
                        type TEXT PRIMARY KEY,
                        data JSONB NOT NULL,
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS system_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS students (
                        id SERIAL PRIMARY KEY,
                        student_id TEXT NOT NULL UNIQUE,
                        name TEXT NOT NULL,
                        email TEXT,
                        phone TEXT,
                        batch TEXT,
                        section TEXT,
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS student_courses (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(student_id, course_id)
                    );
                    CREATE TABLE IF NOT EXISTS exam_routines (
                        id SERIAL PRIMARY KEY,
                        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                        exam_type TEXT NOT NULL CHECK (exam_type IN ('mid', 'final', 'quiz', 'makeup')),
                        exam_date DATE NOT NULL,
                        start_time TIME NOT NULL,
                        end_time TIME NOT NULL,
                        room_number TEXT,
                        section TEXT DEFAULT '',
                        instructions TEXT,
                        canva_template_id TEXT,
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS attendance (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                        exam_routine_id INTEGER REFERENCES exam_routines(id) ON DELETE SET NULL,
                        date DATE NOT NULL,
                        status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
                        marked_by INTEGER REFERENCES users(id),
                        marked_at TIMESTAMPTZ DEFAULT NOW(),
                        notes TEXT,
                        UNIQUE(student_id, course_id, date, exam_routine_id)
                    );
                    CREATE TABLE IF NOT EXISTS canva_templates (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        template_type TEXT NOT NULL CHECK (template_type IN ('attendance', 'exam_routine')),
                        canva_template_id TEXT NOT NULL,
                        canva_design_id TEXT,
                        variables JSONB DEFAULT '[]',
                        is_active BOOLEAN DEFAULT true,
                        created_by INTEGER REFERENCES users(id),
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);

                // Seed default admin user if not exists (password: admin123)
                await client.query(`
                    INSERT INTO users (username, email, password_hash, display_name, role)
                    SELECT 'admin', 'admin@example.com', '$2a$10$Ec6.k0B6RzW2CpqLNnYUY..iB7QIra0GASh6ykoMiwNs2qZedrDMu', 'Administrator', 'admin'
                    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
                `);
                
                client.release();
                useJsonDb = false;
                dbInitError = null;
                dbInitDone = true;
                return;
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ Database initialization attempt ${attempt}/${maxRetries} failed: ${err.message}`);
                
                if (attempt < maxRetries) {
                    const delay = 1000 + Math.random() * 2000;
                    console.log(`Waiting ${Math.round(delay)}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        console.error('❌ All database initialization attempts failed.');
        dbInitError = lastError;
        useJsonDb = false;
    } else {
        if (isVercel) {
            console.error('⚠️ DATABASE_URL not set. Required on Vercel.');
            dbInitError = new Error('DATABASE_URL is required on Vercel');
        } else {
            console.log('⚠️ DATABASE_URL not set. Using local JSON database (db.json) fallback.');
            useJsonDb = true;
            initJsonDb();
        }
    }
}

const initPromise = initDatabase();

module.exports = {
    query: (text, params) => {
        if (dbInitError) throw dbInitError;
        const correlationId = getCorrelationId();
        const start = Date.now();
        const qtype = dbQueryType(text);
        inc('dbQueriesTotal', qtype);
        if (useJsonDb) {
            const result = simulateQuery(text, params);
            const duration = Date.now() - start;
            if (duration > 500) {
                inc('dbSlowQueriesTotal');
                console.warn(`[DB:SLOW] ${duration}ms correlationId=${correlationId.slice(0, 8)} ${text.slice(0, 100)}`);
            }
            return result;
        }
        return pool.query(text, params).then(result => {
            const duration = Date.now() - start;
            if (duration > 500) {
                inc('dbSlowQueriesTotal');
                console.warn(`[DB:SLOW] ${duration}ms correlationId=${correlationId.slice(0, 8)} ${text.slice(0, 100)}`);
            }
            return result;
        }).catch(err => {
            const duration = Date.now() - start;
            inc('dbErrorsTotal');
            console.error(`[DB:ERROR] ${duration}ms correlationId=${correlationId.slice(0, 8)} ${err.message}`);
            throw err;
        });
    },
    useJsonDb: () => useJsonDb,
    waitForInit: () => initPromise
};
