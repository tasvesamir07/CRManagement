-- PostgreSQL database schema for CR Announcement Dashboard

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS announcement_platforms CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS platforms CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. users Table (Authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'cr', -- 'cr', 'admin'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 2. courses Table (Dynamic Course Management)
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_id VARCHAR(20) UNIQUE NOT NULL, -- e.g., "SE211"
    course_name VARCHAR(200) NOT NULL,     -- e.g., "Introduction to Software Engineering"
    teacher_name VARCHAR(200) NOT NULL,    -- e.g., "Dr. Nadirali"
    teacher_initials VARCHAR(20) NOT NULL, -- e.g., "NA"
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_course_id ON courses(course_id);

-- 3. routines Table (Class Schedule with Room Assignment)
CREATE TABLE routines (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week VARCHAR(15) NOT NULL, -- e.g., Monday, Tuesday, Wednesday...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    section VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routines_course ON routines(course_id);
CREATE INDEX idx_routines_day ON routines(day_of_week);

-- 4. platforms Table (WhatsApp / Telegram Targets)
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(100) NOT NULL, -- e.g., "WhatsApp General", "Telegram SE Group"
    platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('whatsapp', 'telegram')),
    chat_id VARCHAR(200) NOT NULL,       -- Group ID, channel ID or chat ID
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platforms_type ON platforms(platform_type);

-- 5. files Table (File Metadata with 15-day auto-expiry)
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(500) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,    -- File identifier (storage key or local filename)
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,         -- uploaded_at + 15 days
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_files_expires ON files(expires_at) WHERE is_deleted = FALSE;

-- 6. announcements Table (Notice Records)
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'notice', 
    -- e.g., 'notice', 'quiz', 'exam', 'class_reminder', 'online_class', 'routine_change', 'result', 'general'
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    custom_room VARCHAR(50),         -- Override room if different from routine
    custom_time TIMESTAMP,           -- Override time if needed
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    file_ids INTEGER[],
    created_by INTEGER REFERENCES users(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'failed'
    scheduled_at TIMESTAMP,          -- For scheduled broadcasts
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_created_by ON announcements(created_by);
CREATE INDEX idx_announcements_course ON announcements(course_id);

-- 7. announcement_platforms Table (Many-to-many: delivery tracking)
CREATE TABLE announcement_platforms (
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES platforms(id) ON DELETE CASCADE,
    platform_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP,
    PRIMARY KEY (announcement_id, platform_id)
);

-- Files that are expired and need cleanup view
CREATE OR REPLACE VIEW expired_files AS
SELECT id, storage_path, original_name
FROM files
WHERE expires_at < NOW() AND is_deleted = FALSE;

-- 8. audit_logs Table (Admin action tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 9. analytics_events Table (Feature usage tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events(created_at);

-- 10. course_members Table (Multi-CR Assignment)
CREATE TABLE IF NOT EXISTS course_members (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'cr', -- 'cr', 'lead'
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_members_user ON course_members(user_id);
CREATE INDEX IF NOT EXISTS idx_course_members_course ON course_members(course_id);

-- Migration: Seed course_members from existing courses.created_by
INSERT INTO course_members (user_id, course_id, role)
SELECT created_by, id, 'lead' FROM courses
WHERE created_by IS NOT NULL
ON CONFLICT DO NOTHING;

