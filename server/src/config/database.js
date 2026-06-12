const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
let useJsonDb = false;
const jsonDbPath = path.join(__dirname, '../../../db.json');

// Simple file lock for concurrent-write safety on db.json
const dbLockPath = path.join(__dirname, '../../../db.lock');
let lockAcquired = false;

function acquireLock() {
    while (true) {
        try {
            const fd = fs.openSync(dbLockPath, 'wx');
            fs.closeSync(fd);
            lockAcquired = true;
            return true;
        } catch (e) {
            if (e.code === 'EEXIST') {
                // Lock exists, wait and retry
                for (let i = 0; i < 50; i++) {
                    const stat = fs.statSync(dbLockPath);
                    // If lock file older than 1s, break it
                    if (Date.now() - stat.mtimeMs > 1000) {
                        try { fs.unlinkSync(dbLockPath); } catch (_) {}
                        break;
                    }
                    // Busy-wait ~10ms
                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
                }
            } else {
                return false;
            }
        }
    }
}

function releaseLock() {
    if (lockAcquired) {
        try {
            fs.unlinkSync(dbLockPath);
        } catch (_) {}
        lockAcquired = false;
    }
}

const JSON_DB_SCHEMA = {
    users: [],
    courses: [],
    routines: [],
    platforms: [],
    files: [],
    announcements: [],
    announcement_platforms: [],
    course_members: [],
    otps: [],
    audit_logs: [],
    analytics_events: [],
    announcement_templates: []
};

// Initialize local JSON Database if it doesn't exist
function initJsonDb() {
    if (!fs.existsSync(jsonDbPath)) {
        fs.writeFileSync(jsonDbPath, JSON.stringify({ ...JSON_DB_SCHEMA }, null, 2));
    } else {
        const data = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
        let needsWrite = false;
        for (const key of Object.keys(JSON_DB_SCHEMA)) {
            if (!(key in data)) {
                data[key] = [];
                needsWrite = true;
            }
        }
        // Auto-migrate: Seed course_members if empty but courses exist
        if (data.course_members.length === 0 && data.courses.length > 0) {
            for (const course of data.courses) {
                if (course.created_by) {
                    data.course_members.push({
                        user_id: course.created_by,
                        course_id: course.id,
                        role: 'lead',
                        assigned_at: new Date().toISOString()
                    });
                }
            }
            needsWrite = true;
        }
        if (needsWrite) {
            acquireLock();
            try {
                fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
            } finally {
                releaseLock();
            }
        }
    }
}

// Read JSON DB
function readJsonDb() {
    initJsonDb();
    const data = fs.readFileSync(jsonDbPath, 'utf8');
    return JSON.parse(data);
}

// Write JSON DB with lock
function writeJsonDb(data) {
    acquireLock();
    try {
        fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
    } finally {
        releaseLock();
    }
}

// Query Simulator for JSON DB
async function simulateQuery(text, params = []) {
    const db = readJsonDb();
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    
    // 1. Auth Queries
    if (normalizedText.includes('INSERT INTO users')) {
        // INSERT INTO users (username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *
        const username = params[0];
        const email = params[1];
        const password_hash = params[2];
        const display_name = params[3] || username;
        const role = params[4] || 'cr';
        
        const newUser = {
            id: db.users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1,
            username,
            email,
            password_hash,
            display_name,
            role,
            is_active: true,
            two_factor_secret: null,
            two_factor_enabled: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.users.push(newUser);
        writeJsonDb(db);
        return { rows: [newUser] };
    }
    
    if (normalizedText.includes('SELECT * FROM users WHERE username =')) {
        const username = params[0];
        const user = db.users.find(u => u.username === username && u.is_active);
        return { rows: user ? [user] : [] };
    }

    if (normalizedText.includes('SELECT * FROM users WHERE email =')) {
        const email = params[0];
        const user = db.users.find(u => u.email === email && u.is_active);
        return { rows: user ? [user] : [] };
    }

    if (normalizedText.includes('SELECT * FROM users WHERE id =')) {
        const id = parseInt(params[0]);
        const user = db.users.find(u => u.id === id && u.is_active);
        return { rows: user ? [user] : [] };
    }

    if (normalizedText.includes('UPDATE users SET password_hash')) {
        const passwordHash = params[0];
        const id = parseInt(params[1]);
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].password_hash = passwordHash;
            db.users[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.users[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE users SET username')) {
        const newUsername = params[0];
        const id = parseInt(params[1]);
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].username = newUsername;
            db.users[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.users[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE users SET display_name')) {
        const displayName = params[0];
        const id = parseInt(params[1]);
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].display_name = displayName;
            db.users[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.users[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE users SET email')) {
        const newEmail = params[0];
        const id = parseInt(params[1]);
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].email = newEmail;
            db.users[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.users[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE users SET two_factor')) {
        const secret = params[0];
        const enabled = params[1];
        const id = parseInt(params[2]);
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].two_factor_secret = secret;
            db.users[idx].two_factor_enabled = enabled;
            db.users[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.users[idx]] };
        }
        return { rows: [] };
    }

    // OTP queries
    if (normalizedText.includes('INSERT INTO otps')) {
        const newOtp = {
            id: db.otps.reduce((max, o) => Math.max(max, o.id || 0), 0) + 1,
            email: params[0],
            otp: params[1],
            type: params[2] || 'password_reset',
            expires_at: params[3],
            used: false,
            created_at: new Date().toISOString()
        };
        db.otps.push(newOtp);
        writeJsonDb(db);
        return { rows: [newOtp] };
    }

    if (normalizedText.includes('SELECT * FROM otps WHERE email =') && normalizedText.includes('used = false')) {
        const email = params[0];
        const type = params[1];
        const otp = db.otps
            .filter(o => o.email === email && o.type === type && !o.used && new Date(o.expires_at) > new Date())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: otp.length > 0 ? [otp[0]] : [] };
    }

    if (normalizedText.includes('UPDATE otps SET used = true')) {
        const id = parseInt(params[0]);
        const idx = db.otps.findIndex(o => o.id === id);
        if (idx !== -1) {
            db.otps[idx].used = true;
            writeJsonDb(db);
            return { rows: [db.otps[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('SELECT * FROM users WHERE is_active = true')) {
        const activeUsers = db.users.filter(u => u.is_active);
        return { rows: activeUsers };
    }

    if (normalizedText.includes('UPDATE users SET role')) {
        const role = params[0];
        const id = parseInt(params[1]);
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].role = role;
            db.users[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.users[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE users SET is_active')) {
        const isActive = params[0];
        const id = parseInt(params[1]);
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].is_active = isActive;
            db.users[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.users[idx]] };
        }
        return { rows: [] };
    }

    // 2. Course Queries
    if (normalizedText.includes('INSERT INTO courses')) {
        // INSERT INTO courses (course_id, course_name, teacher_name, teacher_initials, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *
        const newCourse = {
            id: db.courses.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1,
            course_id: params[0],
            course_name: params[1],
            teacher_name: params[2],
            teacher_initials: params[3],
            created_by: params[4],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.courses.push(newCourse);
        writeJsonDb(db);
        return { rows: [newCourse] };
    }

    if (normalizedText.includes('SELECT * FROM courses WHERE is_active = true') || normalizedText.includes('SELECT * FROM courses WHERE is_active = TRUE')) {
        let activeCourses = db.courses.filter(c => c.is_active);
        if (normalizedText.includes('AND created_by =')) {
            const userId = parseInt(params[0]);
            activeCourses = activeCourses.filter(c => c.created_by === userId);
        }
        return { rows: activeCourses };
    }

    if (normalizedText.includes('SELECT * FROM courses WHERE id =')) {
        const id = parseInt(params[0]);
        const course = db.courses.find(c => c.id === id && c.is_active);
        return { rows: course ? [course] : [] };
    }

    if (normalizedText.includes('UPDATE courses SET course_id')) {
        // UPDATE courses SET course_id=$1, course_name=$2, teacher_name=$3, teacher_initials=$4 WHERE id=$5 RETURNING *
        const id = parseInt(params[4]);
        const idx = db.courses.findIndex(c => c.id === id);
        if (idx !== -1) {
            db.courses[idx] = {
                ...db.courses[idx],
                course_id: params[0],
                course_name: params[1],
                teacher_name: params[2],
                teacher_initials: params[3],
                updated_at: new Date().toISOString()
            };
            writeJsonDb(db);
            return { rows: [db.courses[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE courses SET is_active = false') || normalizedText.includes('UPDATE courses SET is_active = FALSE')) {
        // UPDATE courses SET is_active = false WHERE id = $1
        const id = parseInt(params[0]);
        const idx = db.courses.findIndex(c => c.id === id);
        if (idx !== -1) {
            db.courses[idx].is_active = false;
            db.courses[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.courses[idx]] };
        }
    }

    // 2.5 Course Members Queries
    if (normalizedText.includes('FROM courses c JOIN course_members') || normalizedText.includes('FROM courses JOIN course_members')) {
        const userIdMatch = normalizedText.match(/user_id\s*=\s*\$(\d+)/i);
        if (userIdMatch) {
            const paramIdx = parseInt(userIdMatch[1]) - 1;
            const userId = parseInt(params[paramIdx]);
            const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
            let activeCourses = db.courses.filter(c => c.is_active && userCourseIds.includes(c.id));
            activeCourses.sort((a, b) => a.course_id.localeCompare(b.course_id));
            return { rows: activeCourses };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('FROM users u JOIN course_members cm') || normalizedText.includes('FROM users JOIN course_members')) {
        const courseIdMatch = normalizedText.match(/course_id\s*=\s*\$(\d+)/i);
        if (courseIdMatch) {
            const paramIdx = parseInt(courseIdMatch[1]) - 1;
            const courseId = parseInt(params[paramIdx]);
            const members = db.course_members
                .filter(cm => cm.course_id === courseId)
                .map(cm => {
                    const u = db.users.find(user => user.id === cm.user_id);
                    return u ? {
                        id: u.id,
                        username: u.username,
                        email: u.email,
                        display_name: u.display_name,
                        role: cm.role,
                        assigned_at: cm.assigned_at
                    } : null;
                })
                .filter(Boolean);
            return { rows: members };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('INSERT INTO course_members')) {
        const user_id = parseInt(params[0]);
        const course_id = parseInt(params[1]);
        const role = params[2] || 'cr';
        const exists = db.course_members.some(cm => cm.user_id === user_id && cm.course_id === course_id);
        if (!exists) {
            db.course_members.push({
                user_id,
                course_id,
                role,
                assigned_at: new Date().toISOString()
            });
            writeJsonDb(db);
        }
        return { rows: [{ user_id, course_id, role }] };
    }

    if (normalizedText.includes('DELETE FROM course_members')) {
        const course_id = parseInt(params[0]);
        const user_id = parseInt(params[1]);
        db.course_members = db.course_members.filter(cm => !(cm.course_id === course_id && cm.user_id === user_id));
        writeJsonDb(db);
        return { rows: [{ course_id, user_id }] };
    }

    // 3. Routine Queries
    if (normalizedText.includes('INSERT INTO routines')) {
        let newRoutine;
        if (normalizedText.includes('section')) {
            newRoutine = {
                id: db.routines.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
                course_id: parseInt(params[0]),
                day_of_week: params[1],
                start_time: params[2],
                end_time: params[3],
                room_number: params[4],
                section: params[5] || '',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        } else {
            newRoutine = {
                id: db.routines.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
                course_id: parseInt(params[0]),
                day_of_week: params[1],
                start_time: params[2],
                end_time: params[3],
                room_number: params[4],
                section: '',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
        db.routines.push(newRoutine);
        writeJsonDb(db);
        return { rows: [newRoutine] };
    }

    if (normalizedText.includes('SELECT r.*, c.course_id as c_id, c.course_name')) {
        // SELECT r.*, c.course_id as c_id, c.course_name FROM routines r JOIN courses c ON r.course_id = c.id WHERE r.is_active = true
        let results = db.routines
            .filter(r => r.is_active)
            .map(r => {
                const c = db.courses.find(course => course.id === r.course_id);
                return {
                    ...r,
                    c_id: c ? c.course_id : '',
                    course_name: c ? c.course_name : '',
                    created_by: c ? c.created_by : null
                };
            });
        
        const courseIdMatch = normalizedText.match(/r\.course_id\s*=\s*\$(\d+)/);
        if (courseIdMatch) {
            const paramIdx = parseInt(courseIdMatch[1]) - 1;
            const courseId = parseInt(params[paramIdx]);
            results = results.filter(r => r.course_id === courseId);
        }

        const memberUserIdMatch = normalizedText.match(/course_members\s+WHERE\s+user_id\s*=\s*\$(\d+)/i);
        if (memberUserIdMatch) {
            const paramIdx = parseInt(memberUserIdMatch[1]) - 1;
            const userId = parseInt(params[paramIdx]);
            const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
            results = results.filter(r => userCourseIds.includes(r.course_id));
        } else {
            const userIdMatch = normalizedText.match(/c\.created_by\s*=\s*\$(\d+)/);
            if (userIdMatch) {
                const paramIdx = parseInt(userIdMatch[1]) - 1;
                const userId = parseInt(params[paramIdx]);
                // Use course_members first, fall back to created_by for legacy
                const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
                if (userCourseIds.length > 0) {
                    results = results.filter(r => userCourseIds.includes(r.course_id));
                } else {
                    results = results.filter(r => r.created_by === userId);
                }
            }
        }

        return { rows: results };
    }

    if (normalizedText.includes('SELECT * FROM routines WHERE course_id =')) {
        const courseId = parseInt(params[0]);
        const routines = db.routines.filter(r => r.course_id === courseId && r.is_active);
        return { rows: routines };
    }

    if (normalizedText.includes('UPDATE routines SET')) {
        const id = parseInt(params[6]);
        const idx = db.routines.findIndex(r => r.id === id);
        if (idx !== -1) {
            db.routines[idx] = {
                ...db.routines[idx],
                course_id: parseInt(params[0]),
                day_of_week: params[1],
                start_time: params[2],
                end_time: params[3],
                room_number: params[4],
                section: params[5] || '',
                updated_at: new Date().toISOString()
            };
            writeJsonDb(db);
            return { rows: [db.routines[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('DELETE FROM routines WHERE id =')) {
        const id = parseInt(params[0]);
        const idx = db.routines.findIndex(r => r.id === id);
        if (idx !== -1) {
            db.routines.splice(idx, 1);
            writeJsonDb(db);
            return { rows: [{ id }] };
        }
        return { rows: [] };
    }

    // 4. Platform Queries
    if (normalizedText.includes('INSERT INTO platforms')) {
        // INSERT INTO platforms (platform_name, platform_type, chat_id, description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *
        const newPlatform = {
            id: db.platforms.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1,
            platform_name: params[0],
            platform_type: params[1],
            chat_id: params[2],
            description: params[3],
            created_by: params[4],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.platforms.push(newPlatform);
        writeJsonDb(db);
        return { rows: [newPlatform] };
    }

    if (normalizedText.includes('SELECT * FROM platforms WHERE 1=1') || normalizedText.includes('SELECT * FROM platforms WHERE is_active = true')) {
        let filtered = [...db.platforms];
        if (normalizedText.includes('is_active = true') || normalizedText.includes('is_active = TRUE')) {
            filtered = filtered.filter(p => p.is_active);
        }
        if (normalizedText.includes('AND created_by =')) {
            const userId = parseInt(params[0]);
            filtered = filtered.filter(p => p.created_by === userId);
        }
        return { rows: filtered };
    }

    if (normalizedText.includes('UPDATE platforms SET is_active = false') || normalizedText.includes('UPDATE platforms SET is_active = FALSE')) {
        const id = parseInt(params[0]);
        const idx = db.platforms.findIndex(p => p.id === id);
        if (idx !== -1) {
            db.platforms[idx].is_active = false;
            db.platforms[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.platforms[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE platforms SET platform_name')) {
        const id = parseInt(params[4]);
        const idx = db.platforms.findIndex(p => p.id === id);
        if (idx !== -1) {
            db.platforms[idx] = {
                ...db.platforms[idx],
                platform_name: params[0],
                platform_type: params[1],
                chat_id: params[2],
                description: params[3],
                updated_at: new Date().toISOString()
            };
            writeJsonDb(db);
            return { rows: [db.platforms[idx]] };
        }
        return { rows: [] };
    }

    // 5. File Queries
    if (normalizedText.includes('SUM(file_size)')) {
        let changed = false;
        const activeFiles = db.files.filter(f => {
            if (f.is_deleted) return false;
            const filePath = path.join(__dirname, '../../../uploads', f.storage_path);
            const exists = fs.existsSync(filePath);
            if (!exists) {
                f.is_deleted = true;
                changed = true;
                return false;
            }
            return true;
        });
        if (changed) {
            writeJsonDb(db);
        }
        const sum = activeFiles.reduce((acc, file) => acc + (file.file_size || 0), 0);
        return { rows: [{ used_bytes: sum }] };
    }

    if (normalizedText.includes('INSERT INTO files')) {
        // INSERT INTO files (original_name, storage_path, file_type, file_size, uploaded_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        const newFile = {
            id: db.files.reduce((max, f) => Math.max(max, f.id || 0), 0) + 1,
            original_name: params[0],
            storage_path: params[1],
            file_type: params[2],
            file_size: parseInt(params[3]),
            uploaded_by: params[4],
            expires_at: params[5],
            uploaded_at: new Date().toISOString(),
            is_deleted: false
        };
        db.files.push(newFile);
        writeJsonDb(db);
        return { rows: [newFile] };
    }

    if (normalizedText.includes('SELECT * FROM files WHERE id =')) {
        if (normalizedText.includes('ANY(')) {
            const ids = params[0] || [];
            const matchedFiles = db.files.filter(f => ids.includes(f.id) && !f.is_deleted);
            return { rows: matchedFiles };
        }
        const id = parseInt(params[0]);
        const file = db.files.find(f => f.id === id && !f.is_deleted);
        return { rows: file ? [file] : [] };
    }

    if (normalizedText.includes('UPDATE files SET is_deleted = true') || normalizedText.includes('UPDATE files SET is_deleted = TRUE')) {
        const id = parseInt(params[0]);
        const idx = db.files.findIndex(f => f.id === id);
        if (idx !== -1) {
            db.files[idx].is_deleted = true;
            writeJsonDb(db);
            return { rows: [db.files[idx]] };
        }
        return { rows: [] };
    }

    // 6. Announcement Queries
    if (normalizedText.includes('SELECT COUNT(*) FROM announcements')) {
        let filtered = [...db.announcements];

        // Apply WHERE filters (same logic as the data query below)
        const whereMatch = normalizedText.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
        if (whereMatch) {


            if (normalizedText.includes('a.status =')) {
                const statusMatch = normalizedText.match(/a\.status\s*=\s*\$(\d+)/);
                if (statusMatch) {
                    const idx = parseInt(statusMatch[1]) - 1;
                    filtered = filtered.filter(a => a.status === params[idx]);
                }
            }

            if (normalizedText.includes('a.course_id =')) {
                const courseMatch = normalizedText.match(/a\.course_id\s*=\s*\$(\d+)/);
                if (courseMatch) {
                    const idx = parseInt(courseMatch[1]) - 1;
                    filtered = filtered.filter(a => a.course_id === parseInt(params[idx]));
                }
            }

            if (normalizedText.includes('a.created_by =')) {
                const createdByMatch = normalizedText.match(/a\.created_by\s*=\s*\$(\d+)/);
                if (createdByMatch) {
                    const idx = parseInt(createdByMatch[1]) - 1;
                    filtered = filtered.filter(a => a.created_by === parseInt(params[idx]));
                }
            }

            if (normalizedText.includes('ILIKE')) {
                const searchMatch = normalizedText.match(/\(a\.title\s+ILIKE\s+\$(\d+)/);
                if (searchMatch) {
                    const idx = parseInt(searchMatch[1]) - 1;
                    const pattern = params[idx].replace(/%/g, '');
                    filtered = filtered.filter(a =>
                        (a.title || '').toLowerCase().includes(pattern.toLowerCase()) ||
                        (a.content || '').toLowerCase().includes(pattern.toLowerCase())
                    );
                }
            }

            if (normalizedText.includes('a.created_at >=')) {
                const dateMatch = normalizedText.match(/a\.created_at\s*>=\s*\$(\d+)/);
                if (dateMatch) {
                    const idx = parseInt(dateMatch[1]) - 1;
                    filtered = filtered.filter(a => new Date(a.created_at) >= new Date(params[idx]));
                }
            }

            if (normalizedText.includes('a.created_at <=')) {
                const dateMatch = normalizedText.match(/a\.created_at\s*<=\s*\$(\d+)/);
                if (dateMatch) {
                    const idx = parseInt(dateMatch[1]) - 1;
                    filtered = filtered.filter(a => new Date(a.created_at) <= new Date(params[idx]));
                }
            }
        }

        return { rows: [{ count: filtered.length }] };
    }

    if (normalizedText.includes('INSERT INTO announcements')) {
        let newAnnouncement;
        if (normalizedText.includes('file_ids')) {
            newAnnouncement = {
                id: db.announcements.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1,
                title: params[0],
                content: params[1],
                category: params[2],
                course_id: params[3] ? parseInt(params[3]) : null,
                custom_room: params[4] || null,
                custom_time: params[5] || null,
                file_id: params[6] ? parseInt(params[6]) : null,
                file_ids: params[7] || [],
                created_by: parseInt(params[8]),
                status: params[9] || 'draft',
                scheduled_at: null,
                sent_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        } else {
            newAnnouncement = {
                id: db.announcements.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1,
                title: params[0],
                content: params[1],
                category: params[2],
                course_id: params[3] ? parseInt(params[3]) : null,
                custom_room: params[4] || null,
                custom_time: params[5] || null,
                file_id: params[6] ? parseInt(params[6]) : null,
                file_ids: params[6] ? [parseInt(params[6])] : [],
                created_by: parseInt(params[7]),
                status: params[8] || 'draft',
                scheduled_at: params[9] || null,
                sent_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
        db.announcements.push(newAnnouncement);
        writeJsonDb(db);
        return { rows: [newAnnouncement] };
    }

    if (normalizedText.includes('SELECT a.*, c.course_id as c_id, c.course_name')) {
        // Check if this is a "getDueScheduledAnnouncements" query (no params, has NOW())
        const isScheduledQuery = normalizedText.includes('scheduled_at <= NOW()');

        if (isScheduledQuery) {
            // Filter by status=scheduled and scheduled_at <= now
            const now = new Date().toISOString();
            const filtered = db.announcements.filter(a => a.status === 'scheduled' && a.scheduled_at && new Date(a.scheduled_at) <= new Date(now));
            const list = filtered.map(a => {
                const c = db.courses.find(course => course.id === a.course_id);
                return { ...a, c_id: c ? c.course_id : null, course_name: c ? c.course_name : null };
            });
            list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { rows: list };
        }

        // Fetch announcements with course joining
        let annList = [...db.announcements];

        // Filter by a.id = $N (for getAnnouncementById)
        const idMatch = normalizedText.match(/a\.id\s*=\s*\$(\d+)/i);
        if (idMatch) {
            const idx = parseInt(idMatch[1]) - 1;
            const id = parseInt(params[idx]);
            annList = annList.filter(a => a.id === id);
        }

        const memberUserIdMatch = normalizedText.match(/course_members\s+WHERE\s+user_id\s*=\s*\$(\d+)/i);
        if (memberUserIdMatch) {
            const paramIdx = parseInt(memberUserIdMatch[1]) - 1;
            const userId = parseInt(params[paramIdx]);
            const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
            annList = annList.filter(a => (a.course_id && userCourseIds.includes(a.course_id)) || a.created_by === userId);
        } else {
            const createdByMatch = normalizedText.match(/a\.created_by\s*=\s*\$(\d+)/);
            if (createdByMatch) {
                const idx = parseInt(createdByMatch[1]) - 1;
                const userId = parseInt(params[idx]);
                annList = annList.filter(a => a.created_by === userId);
            }
        }

        const list = annList.map(a => {
            const c = db.courses.find(course => course.id === a.course_id);
            const f = db.files.find(file => file.id === a.file_id);
            const u = db.users.find(user => user.id === a.created_by);
            return {
                ...a,
                c_id: c ? c.course_id : null,
                course_name: c ? c.course_name : null,
                file_name: f ? f.original_name : null,
                created_by_name: u ? u.display_name : null
            };
        });
        
        // Sort by created_at desc
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: list };
    }

    if (normalizedText.match(/SELECT\s+.+\s+FROM announcements WHERE id\s*=\s*\$?\d*/i)) {
        const id = parseInt(params[0]);
        // Return the most recent entry with this id
        let ann = null;
        for (let i = db.announcements.length - 1; i >= 0; i--) {
            if (db.announcements[i].id === id) { ann = db.announcements[i]; break; }
        }
        return { rows: ann ? [ann] : [] };
    }

    if (normalizedText.includes('UPDATE announcements SET scheduled_at =')) {
        // UPDATE announcements SET scheduled_at = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *
        const scheduledAt = params[0];
        const status = params[1];
        const id = parseInt(params[2]);
        // Use findLastIndex to target the most recent entry with this id
        let idx = -1;
        for (let i = db.announcements.length - 1; i >= 0; i--) {
            if (db.announcements[i].id === id) { idx = i; break; }
        }
        if (idx !== -1) {
            db.announcements[idx].scheduled_at = scheduledAt;
            db.announcements[idx].status = status;
            db.announcements[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.announcements[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE announcements SET title')) {
        // UPDATE announcements SET title=$1, content=$2, category=$3, course_id=$4, custom_room=$5, custom_time=$6, file_id=$7, file_ids=$8, updated_at=NOW() WHERE id=$9 RETURNING *
        const id = parseInt(params[8]);
        let idx = -1;
        for (let i = db.announcements.length - 1; i >= 0; i--) {
            if (db.announcements[i].id === id) { idx = i; break; }
        }
        if (idx !== -1) {
            db.announcements[idx].title = params[0];
            db.announcements[idx].content = params[1];
            db.announcements[idx].category = params[2];
            db.announcements[idx].course_id = params[3] ? parseInt(params[3]) : null;
            db.announcements[idx].custom_room = params[4] || null;
            db.announcements[idx].custom_time = params[5] || null;
            db.announcements[idx].file_id = params[6] ? parseInt(params[6]) : null;
            db.announcements[idx].file_ids = params[7] || [];
            db.announcements[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.announcements[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE announcements SET status =')) {
        // Pattern 1: UPDATE announcements SET status = $1, sent_at = NOW() WHERE id = $2 RETURNING *
        //   params = [finalStatus, id], length = 2
        // Pattern 2: UPDATE announcements SET status = 'sending', updated_at = NOW() WHERE id = $1
        //   params = [id], length = 1 (literal status)
        // Pattern 3: UPDATE announcements SET status = 'failed', updated_at = NOW() WHERE id = $1
        //   params = [id], length = 1 (literal status)
        // Pattern 4: UPDATE announcements SET status = $1, updated_at = NOW() WHERE id = $2
        //   params = [status, id], length = 2

        let status, id;

        if (params.length === 2) {
            // Parameterized status
            status = params[0];
            id = parseInt(params[1]);
        } else if (params.length === 1) {
            // Literal status — extract from SQL
            const statusMatch = normalizedText.match(/SET\s+status\s*=\s*'(\w+)'/i);
            status = statusMatch ? statusMatch[1] : 'unknown';
            id = parseInt(params[0]);
        }

        let idx = -1;
        for (let i = db.announcements.length - 1; i >= 0; i--) {
            if (db.announcements[i].id === id) { idx = i; break; }
        }
        if (idx !== -1 && id) {
            db.announcements[idx].status = status;
            const sentAtMatch = normalizedText.includes('sent_at = NOW()');
            if (sentAtMatch) {
                db.announcements[idx].sent_at = new Date().toISOString();
            }
            db.announcements[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.announcements[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('DELETE FROM announcements WHERE id =')) {
        const id = parseInt(params[0]);
        // Delete the most recent entry with this id
        let idx = -1;
        for (let i = db.announcements.length - 1; i >= 0; i--) {
            if (db.announcements[i].id === id) { idx = i; break; }
        }
        if (idx !== -1) {
            db.announcements.splice(idx, 1);
            // Cascade delete from announcement_platforms
            db.announcement_platforms = db.announcement_platforms.filter(ap => ap.announcement_id !== id);
            writeJsonDb(db);
            return { rows: [{ id }] };
        }
        return { rows: [] };
    }

    // 7. Announcement Platforms Queries
    if (normalizedText.includes('DELETE FROM announcement_platforms')) {
        // DELETE FROM announcement_platforms WHERE announcement_id = $1
        const annId = parseInt(params[0]);
        db.announcement_platforms = db.announcement_platforms.filter(ap => ap.announcement_id !== annId);
        writeJsonDb(db);
        return { rows: [{ announcement_id: annId }] };
    }

    if (normalizedText.includes('INSERT INTO announcement_platforms')) {
        // INSERT INTO announcement_platforms (announcement_id, platform_id, platform_status, error_message, sent_at) VALUES ($1, $2, $3, $4, $5)
        const ap = {
            announcement_id: parseInt(params[0]),
            platform_id: parseInt(params[1]),
            platform_status: params[2] || 'pending',
            error_message: params[3] || null,
            sent_at: params[4] || null
        };
        // Check if exists
        const idx = db.announcement_platforms.findIndex(x => x.announcement_id === ap.announcement_id && x.platform_id === ap.platform_id);
        if (idx !== -1) {
            db.announcement_platforms[idx] = ap;
        } else {
            db.announcement_platforms.push(ap);
        }
        writeJsonDb(db);
        return { rows: [ap] };
    }

    if (normalizedText.includes('SELECT ap.*, p.platform_name')) {
        // SELECT ap.*, p.platform_name, p.platform_type FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1
        // OR: WHERE ap.announcement_id = ANY($1) (batch)
        let annIds;
        if (normalizedText.includes('ANY(')) {
            annIds = params[0] || [];
        } else {
            annIds = [parseInt(params[0])];
        }

        const filtered = db.announcement_platforms
            .filter(ap => annIds.includes(ap.announcement_id))
            .map(ap => {
                const p = db.platforms.find(plat => plat.id === ap.platform_id);
                return {
                    ...ap,
                    platform_name: p ? p.platform_name : 'Unknown',
                    platform_type: p ? p.platform_type : 'unknown',
                    chat_id: p ? p.chat_id : ''
                };
            });
        return { rows: filtered };
    }

    if (normalizedText.includes('UPDATE announcement_platforms SET platform_status =')) {
        let status, errorMsg, annId, platId, sentAt;
        if (normalizedText.includes('error_message =')) {
            status = params[0];
            errorMsg = params[1];
            annId = parseInt(params[2]);
            platId = parseInt(params[3]);
        } else {
            status = params[0];
            errorMsg = null;
            annId = parseInt(params[1]);
            platId = parseInt(params[2]);
            if (status === 'sent') {
                sentAt = new Date().toISOString();
            }
        }

        const idx = db.announcement_platforms.findIndex(ap => ap.announcement_id === annId && ap.platform_id === platId);
        if (idx !== -1) {
            db.announcement_platforms[idx].platform_status = status;
            db.announcement_platforms[idx].error_message = errorMsg;
            if (sentAt) {
                db.announcement_platforms[idx].sent_at = sentAt;
            }
            writeJsonDb(db);
            return { rows: [db.announcement_platforms[idx]] };
        }
        return { rows: [] };
    }

    // 8. Audit Log Queries
    if (normalizedText.includes('INSERT INTO audit_logs')) {
        const newLog = {
            id: db.audit_logs.reduce((max, l) => Math.max(max, l.id || 0), 0) + 1,
            user_id: parseInt(params[0]),
            action: params[1],
            entity_type: params[2] || null,
            entity_id: params[3] ? parseInt(params[3]) : null,
            details: params[4] || null,
            ip_address: params[5] || null,
            created_at: new Date().toISOString()
        };
        db.audit_logs.push(newLog);
        writeJsonDb(db);
        return { rows: [newLog] };
    }

    if (normalizedText.includes('FROM audit_logs al') || normalizedText.includes('FROM audit_logs')) {
        if (normalizedText.includes('COUNT(*)')) {
            return { rows: [{ count: db.audit_logs.length }] };
        }
        const logs = [...db.audit_logs]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(log => {
                const u = db.users.find(user => user.id === log.user_id);
                return {
                    ...log,
                    username: u ? u.username : null,
                    display_name: u ? u.display_name : null
                };
            });
        return { rows: logs };
    }

    // 9. Analytics Events Queries
    if (normalizedText.includes('INSERT INTO analytics_events')) {
        const newEvent = {
            id: db.analytics_events.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1,
            event_type: params[0],
            user_id: params[1] ? parseInt(params[1]) : null,
            metadata: params[2] || null,
            created_at: new Date().toISOString()
        };
        db.analytics_events.push(newEvent);
        writeJsonDb(db);
        return { rows: [newEvent] };
    }

    if (normalizedText.includes('FROM analytics_events')) {
        if (normalizedText.includes('COUNT(*)')) {
            return { rows: [{ count: db.analytics_events.length }] };
        }
        let filtered = [...db.analytics_events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (normalizedText.includes('event_type =')) {
            const idx = normalizedText.match(/\$(\d+)/);
            if (idx) {
                const et = params[parseInt(idx[1]) - 1];
                filtered = filtered.filter(e => e.event_type === et);
            }
        }
        return { rows: filtered };
    }

    // Aggregation queries for dashboard stats
    if (normalizedText.includes('DATE(created_at)')) {
        // Announcements per day grouping
        const groups = {};
        for (const a of db.announcements) {
            const d = new Date(a.created_at).toISOString().split('T')[0];
            groups[d] = (groups[d] || 0) + 1;
        }
        const rows = Object.entries(groups)
            .map(([date, count]) => ({ date, count: String(count) }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return { rows };
    }

    if (normalizedText.includes('announcement_platforms ap') && normalizedText.includes('GROUP BY')) {
        // Delivery stats grouping
        const groups = {};
        for (const ap of db.announcement_platforms) {
            const p = db.platforms.find(plat => plat.id === ap.platform_id);
            const key = `${p?.platform_type || 'unknown'}|${p?.platform_name || 'unknown'}|${ap.platform_status || 'unknown'}`;
            groups[key] = (groups[key] || 0) + 1;
        }
        const rows = Object.entries(groups).map(([key, count]) => {
            const parts = key.split('|');
            return { platform_type: parts[0], platform_name: parts[1], platform_status: parts[2], count: String(count) };
        });
        return { rows };
    }

    if (normalizedText.includes('JOIN announcements a ON a.created_by = u.id') && normalizedText.includes('GROUP BY')) {
        // Top users query
        const userCounts = {};
        for (const a of db.announcements) {
            const u = db.users.find(user => user.id === a.created_by);
            if (u) {
                userCounts[u.id] = userCounts[u.id] || { id: u.id, username: u.username, display_name: u.display_name, announcement_count: 0 };
                userCounts[u.id].announcement_count++;
            }
        }
        const rows = Object.values(userCounts)
            .sort((a, b) => b.announcement_count - a.announcement_count)
            .slice(0, 10);
        return { rows };
    }

    // 10. Template Queries
    if (normalizedText.includes('FROM announcement_templates')) {
        if (normalizedText.includes('WHERE id =')) {
            const id = parseInt(params[0]);
            const tpl = db.announcement_templates.find(t => t.id === id && t.is_active);
            return { rows: tpl ? [tpl] : [] };
        }
        let templates = [...db.announcement_templates].filter(t => t.is_active);
        const userMatch = normalizedText.match(/created_by\s*=\s*\$(\d+)/i);
        if (userMatch) {
            const idx = parseInt(userMatch[1]) - 1;
            const userId = params[idx];
            templates = templates.filter(t => t.created_by === userId || !t.created_by);
        }
        templates.sort((a, b) => a.name.localeCompare(b.name));
        return { rows: templates };
    }

    if (normalizedText.includes('INSERT INTO announcement_templates')) {
        const newTpl = {
            id: db.announcement_templates.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1,
            name: params[0],
            description: params[1] || '',
            category: params[2] || 'notice',
            title_template: params[3],
            content_template: params[4],
            variables: params[5] || [],
            is_active: true,
            created_by: params[6] || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.announcement_templates.push(newTpl);
        writeJsonDb(db);
        return { rows: [newTpl] };
    }

    if (normalizedText.includes('UPDATE announcement_templates SET name=')) {
        const id = parseInt(params[6]);
        let idx = -1;
        for (let i = db.announcement_templates.length - 1; i >= 0; i--) {
            if (db.announcement_templates[i].id === id) { idx = i; break; }
        }
        if (idx !== -1) {
            db.announcement_templates[idx].name = params[0];
            db.announcement_templates[idx].description = params[1];
            db.announcement_templates[idx].category = params[2];
            db.announcement_templates[idx].title_template = params[3];
            db.announcement_templates[idx].content_template = params[4];
            db.announcement_templates[idx].variables = params[5];
            db.announcement_templates[idx].updated_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.announcement_templates[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE announcement_templates SET is_active = false')) {
        const id = parseInt(params[0]);
        let idx = -1;
        for (let i = db.announcement_templates.length - 1; i >= 0; i--) {
            if (db.announcement_templates[i].id === id) { idx = i; break; }
        }
        if (idx !== -1) {
            db.announcement_templates[idx].is_active = false;
            writeJsonDb(db);
            return { rows: [db.announcement_templates[idx]] };
        }
        return { rows: [] };
    }

    return { rows: [] };
}

// Check database URL config
if (process.env.DATABASE_URL) {
    console.log('PostgreSQL database URL detected. Initializing database pool...');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('render')
            ? { rejectUnauthorized: false }
            : false
    });
    
    // Quick test connection
    pool.connect((err, client, release) => {
        if (err) {
            console.error('⚠️ Database connection failed. Falling back to local JSON database (db.json)...', err.message);
            useJsonDb = true;
            initJsonDb();
        } else {
            console.log('✅ PostgreSQL database connected successfully.');
            release();
        }
    });
} else {
    console.log('⚠️ DATABASE_URL not set. Using local JSON database (db.json) fallback.');
    useJsonDb = true;
    initJsonDb();
}

module.exports = {
    query: (text, params) => {
        if (useJsonDb) {
            return simulateQuery(text, params);
        }
        return pool.query(text, params);
    },
    useJsonDb: () => useJsonDb
};
