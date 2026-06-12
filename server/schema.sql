-- CR Announcement Dashboard - Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/zmqoqvubfskdukehnqos/sql/new)

-- 1. Users
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

-- 2. Courses
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

-- 3. Routines
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

-- 4. Platforms (WhatsApp / Telegram channels)
CREATE TABLE IF NOT EXISTS platforms (
    id SERIAL PRIMARY KEY,
    platform_name TEXT NOT NULL,
    platform_type TEXT NOT NULL CHECK (platform_type IN ('whatsapp', 'telegram', 'messenger')),
    chat_id TEXT NOT NULL,
    description TEXT,
    created_by INTEGER,
    course_id INTEGER REFERENCES courses(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Files
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    original_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by INTEGER,
    expires_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- 6. Announcements
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Announcement-Platform mapping (delivery status per platform)
CREATE TABLE IF NOT EXISTS announcement_platforms (
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES platforms(id),
    platform_status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    PRIMARY KEY (announcement_id, platform_id)
);

-- 8. Course members
CREATE TABLE IF NOT EXISTS course_members (
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    role TEXT DEFAULT 'cr',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)
);

-- 9. OTPs (for password reset)
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    type TEXT DEFAULT 'password_reset',
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Audit logs
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

-- 11. Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id INTEGER,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Announcement templates
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

-- 13. WhatsApp auth credentials (persists across deploys)
CREATE TABLE IF NOT EXISTS whatsapp_creds (
    type TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Seed: Default admin user
-- Password: admin123 (bcrypt hash)
-- Run once, then login with username "admin" / password "admin123"
-- IMPORTANT: Change password after first login
-- ============================================================
INSERT INTO users (username, email, password_hash, display_name, role)
SELECT 'admin', 'admin@example.com', '$2a$10$Ec6.k0B6RzW2CpqLNnYUY..iB7QIra0GASh6ykoMiwNs2qZedrDMu', 'Administrator', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
