function handle(text, params, db, { writeJsonDb }) {
    if (text.includes('INSERT INTO courses')) {
        const newCourse = {
            id: db.courses.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1,
            course_id: params[0], course_name: params[1],
            teacher_name: params[2] || null, teacher_initials: params[3] || null,
            created_by: params[4] || null, default_platform_ids: [],
            is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        db.courses.push(newCourse); writeJsonDb(db);
        return { rows: [newCourse] };
    }
    if (text.includes('SELECT * FROM courses WHERE is_active = true') || text.includes('SELECT * FROM courses WHERE is_active = TRUE')) {
        let activeCourses = db.courses.filter(c => c.is_active);
        if (text.includes('AND created_by =')) activeCourses = activeCourses.filter(c => c.created_by === parseInt(params[0]));
        return { rows: activeCourses };
    }
    if (text.includes('SELECT * FROM courses WHERE id =')) {
        const course = db.courses.find(c => c.id === parseInt(params[0]) && c.is_active);
        return { rows: course ? [course] : [] };
    }
    if (text.includes('UPDATE courses SET course_id')) {
        const id = parseInt(params[4]), idx = db.courses.findIndex(c => c.id === id);
        if (idx !== -1) { db.courses[idx] = { ...db.courses[idx], course_id: params[0], course_name: params[1], teacher_name: params[2] || null, teacher_initials: params[3] || null, updated_at: new Date().toISOString() }; writeJsonDb(db); return { rows: [db.courses[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE courses SET is_active = false') || text.includes('UPDATE courses SET is_active = FALSE')) {
        const id = parseInt(params[0]), idx = db.courses.findIndex(c => c.id === id);
        if (idx !== -1) { db.courses[idx].is_active = false; db.courses[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.courses[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE courses SET default_platform_ids')) {
        const idx = db.courses.findIndex(c => c.id === parseInt(params[1]));
        if (idx !== -1) { db.courses[idx].default_platform_ids = params[0]; db.courses[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.courses[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('INSERT INTO routines')) {
        const hasSection = text.includes('section');
        const newRoutine = {
            id: db.routines.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
            course_id: parseInt(params[0]), day_of_week: params[1],
            start_time: params[2], end_time: params[3],
            room_number: params[4] || null, section: hasSection ? (params[5] || '') : '',
            is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        db.routines.push(newRoutine); writeJsonDb(db);
        return { rows: [newRoutine] };
    }
    if (text.includes('SELECT r.*, c.course_id as c_id, c.course_name')) {
        let results = db.routines.filter(r => r.is_active).map(r => {
            const c = db.courses.find(course => course.id === r.course_id);
            return { ...r, c_id: c ? c.course_id : '', course_name: c ? c.course_name : '', created_by: c ? c.created_by : null };
        });
        const courseIdMatch = text.match(/r\.course_id\s*=\s*\$(\d+)/);
        if (courseIdMatch) results = results.filter(r => r.course_id === parseInt(params[parseInt(courseIdMatch[1]) - 1]));
        const memberUserIdMatch = text.match(/course_members\s+WHERE\s+user_id\s*=\s*\$(\d+)/i);
        if (memberUserIdMatch) {
            const userId = parseInt(params[parseInt(memberUserIdMatch[1]) - 1]);
            const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
            results = results.filter(r => userCourseIds.includes(r.course_id));
        } else {
            const userIdMatch = text.match(/c\.created_by\s*=\s*\$(\d+)/);
            if (userIdMatch) {
                const userId = parseInt(params[parseInt(userIdMatch[1]) - 1]);
                const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
                results = results.filter(r => userCourseIds.length > 0 ? userCourseIds.includes(r.course_id) : r.created_by === userId);
            }
        }
        return { rows: results };
    }
    if (text.includes('SELECT * FROM routines WHERE course_id =')) {
        return { rows: db.routines.filter(r => r.course_id === parseInt(params[0]) && r.is_active) };
    }
    if (text.includes('UPDATE routines SET') && !text.includes('default_platform_ids')) {
        const id = parseInt(params[6]), idx = db.routines.findIndex(r => r.id === id);
        if (idx !== -1) { db.routines[idx] = { ...db.routines[idx], course_id: parseInt(params[0]), day_of_week: params[1], start_time: params[2], end_time: params[3], room_number: params[4], section: params[5] || '', updated_at: new Date().toISOString() }; writeJsonDb(db); return { rows: [db.routines[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('DELETE FROM routines WHERE id =')) {
        const id = parseInt(params[0]), idx = db.routines.findIndex(r => r.id === id);
        if (idx !== -1) { db.routines.splice(idx, 1); writeJsonDb(db); return { rows: [{ id }] }; }
        return { rows: [] };
    }
    return null;
}

module.exports = { handle };
