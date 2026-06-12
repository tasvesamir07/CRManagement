-- PostgreSQL database schema for CR Announcement Dashboard

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS announcement_platforms CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS platforms CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS course_members CASCADE;
DROP TABLE IF EXISTS otps CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS announcement_templates CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'cr',
    is_active BOOLEAN DEFAULT true,
    two_factor_secret TEXT,
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    course_id VARCHAR(255) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    teacher_initials VARCHAR(50) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_members (
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    role VARCHAR(50) DEFAULT 'cr',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS routines (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(100),
    section VARCHAR(100) DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platforms (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(255) NOT NULL,
    platform_type VARCHAR(50) NOT NULL CHECK (platform_type IN ('whatsapp', 'telegram')),
    chat_id VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    course_id INTEGER REFERENCES courses(id),
    custom_room VARCHAR(255),
    custom_time VARCHAR(255),
    file_id INTEGER REFERENCES files(id),
    file_ids INTEGER[] DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_platforms (
    announcement_id INTEGER REFERENCES announcements(id),
    platform_id INTEGER REFERENCES platforms(id),
    platform_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    PRIMARY KEY (announcement_id, platform_id)
);

CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    type VARCHAR(50) DEFAULT 'password_reset',
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    title_template VARCHAR(500) NOT NULL,
    content_template TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expired files view (used by cleanupExpiredFiles cron job)
CREATE OR REPLACE VIEW expired_files AS
SELECT id, storage_path, original_name
FROM files
WHERE expires_at < NOW() AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_scheduled ON announcements(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_announcement_platforms_announcement ON announcement_platforms(announcement_id);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_expires ON files(expires_at) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_platforms_type ON platforms(platform_type);
CREATE INDEX IF NOT EXISTS idx_routines_day ON routines(day_of_week);
CREATE INDEX IF NOT EXISTS idx_course_members_user ON course_members(user_id);
CREATE INDEX IF NOT EXISTS idx_course_members_course ON course_members(course_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_courses_course_id ON courses(course_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events(created_at);

