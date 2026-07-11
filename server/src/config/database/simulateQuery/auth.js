function handle(text, params, db, { writeJsonDb }) {
    if (text.includes('INSERT INTO users')) {
        const username = params[0], email = params[1], password_hash = params[2];
        const display_name = params[3] || username, role = params[4] || 'cr';
        const newUser = {
            id: db.users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1,
            username, email, password_hash, display_name, role,
            is_active: true, two_factor_secret: null, two_factor_enabled: false,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        db.users.push(newUser); writeJsonDb(db);
        return { rows: [newUser] };
    }
    if (text.includes('SELECT * FROM users WHERE username =')) {
        const user = db.users.find(u => u.username === params[0] && u.is_active);
        return { rows: user ? [user] : [] };
    }
    if (text.includes('SELECT * FROM users WHERE email =')) {
        const user = db.users.find(u => u.email === params[0] && u.is_active);
        return { rows: user ? [user] : [] };
    }
    if (text.includes('SELECT * FROM users WHERE id =')) {
        const user = db.users.find(u => u.id === parseInt(params[0]) && u.is_active);
        return { rows: user ? [user] : [] };
    }
    if (text.includes('SELECT role FROM users WHERE id =')) {
        const user = db.users.find(u => u.id === parseInt(params[0]) && u.is_active);
        return { rows: user ? [{ role: user.role }] : [] };
    }
    if (text.includes('UPDATE users SET password_hash')) {
        const idx = db.users.findIndex(u => u.id === parseInt(params[1]));
        if (idx !== -1) { db.users[idx].password_hash = params[0]; db.users[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.users[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE users SET username')) {
        const idx = db.users.findIndex(u => u.id === parseInt(params[1]));
        if (idx !== -1) { db.users[idx].username = params[0]; db.users[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.users[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE users SET display_name')) {
        const idx = db.users.findIndex(u => u.id === parseInt(params[1]));
        if (idx !== -1) { db.users[idx].display_name = params[0]; db.users[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.users[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE users SET email')) {
        const idx = db.users.findIndex(u => u.id === parseInt(params[1]));
        if (idx !== -1) { db.users[idx].email = params[0]; db.users[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.users[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE users SET two_factor')) {
        const idx = db.users.findIndex(u => u.id === parseInt(params[2]));
        if (idx !== -1) { db.users[idx].two_factor_secret = params[0]; db.users[idx].two_factor_enabled = params[1]; db.users[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.users[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('SELECT * FROM users WHERE is_active = true')) {
        return { rows: db.users.filter(u => u.is_active) };
    }
    if (text.includes('UPDATE users SET role')) {
        const idx = db.users.findIndex(u => u.id === parseInt(params[1]));
        if (idx !== -1) { db.users[idx].role = params[0]; db.users[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.users[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE users SET is_active')) {
        const idx = db.users.findIndex(u => u.id === parseInt(params[1]));
        if (idx !== -1) { db.users[idx].is_active = params[0]; db.users[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.users[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('INSERT INTO otps')) {
        const newOtp = {
            id: db.otps.reduce((max, o) => Math.max(max, o.id || 0), 0) + 1,
            email: params[0], otp: params[1], type: params[2] || 'password_reset',
            expires_at: params[3], used: false, created_at: new Date().toISOString()
        };
        db.otps.push(newOtp); writeJsonDb(db);
        return { rows: [newOtp] };
    }
    if (text.includes('SELECT * FROM otps WHERE email =') && text.includes('used = false')) {
        const otp = db.otps
            .filter(o => o.email === params[0] && o.type === params[1] && !o.used && new Date(o.expires_at) > new Date())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: otp.length > 0 ? [otp[0]] : [] };
    }
    if (text.includes('UPDATE otps SET used = true')) {
        const idx = db.otps.findIndex(o => o.id === parseInt(params[0]));
        if (idx !== -1) { db.otps[idx].used = true; writeJsonDb(db); return { rows: [db.otps[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('FROM courses c JOIN course_members') || text.includes('FROM courses JOIN course_members')) {
        const m = text.match(/user_id\s*=\s*\$(\d+)/i);
        if (m) {
            const userId = parseInt(params[parseInt(m[1]) - 1]);
            const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
            let activeCourses = db.courses.filter(c => c.is_active && userCourseIds.includes(c.id));
            activeCourses.sort((a, b) => a.course_id.localeCompare(b.course_id));
            return { rows: activeCourses };
        }
        return { rows: [] };
    }
    if (text.includes('FROM users u JOIN course_members cm') || text.includes('FROM users JOIN course_members')) {
        const m = text.match(/course_id\s*=\s*\$(\d+)/i);
        if (m) {
            const courseId = parseInt(params[parseInt(m[1]) - 1]);
            const members = db.course_members.filter(cm => cm.course_id === courseId)
                .map(cm => { const u = db.users.find(user => user.id === cm.user_id); return u ? { id: u.id, username: u.username, email: u.email, display_name: u.display_name, role: cm.role, assigned_at: cm.assigned_at } : null; })
                .filter(Boolean);
            return { rows: members };
        }
        return { rows: [] };
    }
    if (text.includes('INSERT INTO course_members')) {
        const user_id = parseInt(params[0]), course_id = parseInt(params[1]), role = params[2] || 'cr';
        if (!db.course_members.some(cm => cm.user_id === user_id && cm.course_id === course_id)) {
            db.course_members.push({ user_id, course_id, role, assigned_at: new Date().toISOString() });
            writeJsonDb(db);
        }
        return { rows: [{ user_id, course_id, role }] };
    }
    if (text.includes('DELETE FROM course_members')) {
        const course_id = parseInt(params[0]), user_id = parseInt(params[1]);
        db.course_members = db.course_members.filter(cm => !(cm.course_id === course_id && cm.user_id === user_id));
        writeJsonDb(db);
        return { rows: [{ course_id, user_id }] };
    }
    return null;
}

module.exports = { handle };
