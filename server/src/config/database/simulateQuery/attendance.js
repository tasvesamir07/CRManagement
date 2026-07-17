function handle(text, params, db, { writeJsonDb }) {
    const normalizedText = text.trim().replace(/\s+/g, ' ');

    if (normalizedText.includes('INSERT INTO students') && normalizedText.includes('RETURNING *')) {
        const newStudent = {
            id: db.students.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1,
            student_id: params[0] || `S-${Date.now()}`,
            name: params[1] || '',
            email: params[2] || null,
            phone: params[3] || null,
            batch: params[4] || null,
            section: params[5] || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.students.push(newStudent);
        writeJsonDb(db);
        return { rows: [newStudent] };
    }

    if (normalizedText.includes('SELECT COUNT(*) FROM students') && normalizedText.includes('is_active')) {
        let filtered = db.students.filter(s => s.is_active);
        return { rows: [{ count: filtered.length }] };
    }

    if (normalizedText.includes('SELECT s.* FROM students') || (normalizedText.includes('SELECT * FROM students') && !normalizedText.includes('attendance'))) {
        let results = db.students.filter(s => s.is_active);
        const courseIdMatch = normalizedText.match(/student_courses WHERE course_id\s*=\s*\$(\d+)/);
        if (courseIdMatch) {
            const cid = parseInt(params[parseInt(courseIdMatch[1]) - 1]);
            const enrolledIds = (db.student_courses || []).filter(sc => sc.course_id === cid).map(sc => sc.student_id);
            results = results.filter(s => enrolledIds.includes(s.id));
        }
        return { rows: results };
    }

    if (normalizedText.includes('UPDATE students SET') && !normalizedText.includes('is_active')) {
        const id = parseInt(params[params.length - 1]), idx = db.students.findIndex(s => s.id === id);
        if (idx !== -1) {
            db.students[idx] = { ...db.students[idx], student_id: params[0] || db.students[idx].student_id, name: params[1] || db.students[idx].name, email: params[2] || null, phone: params[3] || null, batch: params[4] || null, section: params[5] || null, is_active: params[6] !== undefined ? params[6] : db.students[idx].is_active, updated_at: new Date().toISOString() };
            writeJsonDb(db);
            return { rows: [db.students[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE students SET is_active')) {
        const id = parseInt(params[0]), idx = db.students.findIndex(s => s.id === id);
        if (idx !== -1) { db.students[idx].is_active = false; db.students[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.students[idx]] }; }
        return { rows: [] };
    }

    if (normalizedText.includes('DELETE FROM students')) {
        const id = parseInt(params[0]), idx = db.students.findIndex(s => s.id === id);
        if (idx !== -1) { db.students.splice(idx, 1); writeJsonDb(db); return { rows: [{ id }] }; }
        return { rows: [] };
    }

    if (normalizedText.includes('INSERT INTO student_courses')) {
        const conflictMatch = normalizedText.includes('ON CONFLICT');
        if (conflictMatch) {
            const existing = (db.student_courses || []).find(sc => sc.student_id === parseInt(params[0]) && sc.course_id === parseInt(params[1]));
            if (existing) return { rows: [existing] };
        }
        const newSc = {
            id: (db.student_courses || []).reduce((max, sc) => Math.max(max, sc.id || 0), 0) + 1,
            student_id: parseInt(params[0]),
            course_id: parseInt(params[1]),
            enrolled_at: new Date().toISOString()
        };
        db.student_courses.push(newSc);
        writeJsonDb(db);
        return { rows: [newSc] };
    }

    if (normalizedText.includes('DELETE FROM student_courses')) {
        const before = db.student_courses.length;
        const sid = parseInt(params[0]), cid = parseInt(params[1]);
        db.student_courses = db.student_courses.filter(sc => !(sc.student_id === sid && sc.course_id === cid));
        if (db.student_courses.length < before) writeJsonDb(db);
        return { rows: [{ student_id: sid, course_id: cid }] };
    }

    if (normalizedText.includes('SELECT c.* FROM courses c JOIN student_courses sc')) {
        const sid = parseInt(params[0]);
        const enrolled = (db.student_courses || []).filter(sc => sc.student_id === sid).map(sc => sc.course_id);
        return { rows: db.courses.filter(c => enrolled.includes(c.id) && c.is_active) };
    }

    if (normalizedText.includes('SELECT id FROM courses WHERE is_active') && !normalizedText.includes('student')) {
        return { rows: db.courses.filter(c => c.is_active).map(c => ({ id: c.id })) };
    }

    if (normalizedText.includes('INSERT INTO exam_routines') && normalizedText.includes('RETURNING *')) {
        const newExam = {
            id: db.exam_routines.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1,
            course_id: parseInt(params[0]),
            exam_type: params[1],
            exam_date: params[2],
            start_time: params[3],
            end_time: params[4],
            room_number: params[5] || null,
            section: params[6] || '',
            instructions: params[7] || null,
            canva_template_id: params[8] || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.exam_routines.push(newExam);
        writeJsonDb(db);
        return { rows: [newExam] };
    }

    if (normalizedText.includes('SELECT er.*, c.course_id as c_id, c.course_name FROM exam_routines er JOIN courses c')) {
        let results = db.exam_routines.filter(e => e.is_active).map(e => {
            const c = db.courses.find(course => course.id === e.course_id);
            return { ...e, c_id: c ? c.course_id : '', course_name: c ? c.course_name : '' };
        });
        return { rows: results };
    }

    if (normalizedText.includes('UPDATE exam_routines SET') && normalizedText.includes('RETURNING *') && !normalizedText.includes('is_active = false')) {
        const id = parseInt(params[params.length - 1]), idx = db.exam_routines.findIndex(e => e.id === id);
        if (idx !== -1) {
            db.exam_routines[idx] = { ...db.exam_routines[idx], updated_at: new Date().toISOString() };
            if (params[0] !== undefined) db.exam_routines[idx].course_id = parseInt(params[0]);
            if (params[1] !== undefined) db.exam_routines[idx].exam_type = params[1];
            if (params[2] !== undefined) db.exam_routines[idx].exam_date = params[2];
            if (params[3] !== undefined) db.exam_routines[idx].start_time = params[3];
            if (params[4] !== undefined) db.exam_routines[idx].end_time = params[4];
            if (params[5] !== undefined) db.exam_routines[idx].room_number = params[5];
            writeJsonDb(db);
            return { rows: [db.exam_routines[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE exam_routines SET is_active')) {
        const id = parseInt(params[0]), idx = db.exam_routines.findIndex(e => e.id === id);
        if (idx !== -1) { db.exam_routines[idx].is_active = false; db.exam_routines[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.exam_routines[idx]] }; }
        return { rows: [] };
    }

    if (normalizedText.includes('DELETE FROM exam_routines')) {
        const id = parseInt(params[0]), idx = db.exam_routines.findIndex(e => e.id === id);
        if (idx !== -1) { db.exam_routines.splice(idx, 1); writeJsonDb(db); return { rows: [{ id }] }; }
        return { rows: [] };
    }

    if (normalizedText.includes('INSERT INTO attendance') && normalizedText.includes('ON CONFLICT')) {
        const sid = parseInt(params[0]), cid = parseInt(params[1]), date = params[3], erid = params[2];
        const existing = (db.attendance || []).find(a => a.student_id === sid && a.course_id === cid && a.date === date);
        if (existing) {
            existing.status = params[4] || existing.status;
            existing.marked_by = params[6] || existing.marked_by;
            existing.notes = params[5] || existing.notes;
            existing.marked_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [existing] };
        }
        const newAtt = {
            id: (db.attendance || []).reduce((max, a) => Math.max(max, a.id || 0), 0) + 1,
            student_id: sid,
            course_id: cid,
            exam_routine_id: erid || null,
            date: date,
            status: params[4] || 'present',
            notes: params[5] || null,
            marked_by: params[6] || null,
            marked_at: new Date().toISOString()
        };
        db.attendance.push(newAtt);
        writeJsonDb(db);
        return { rows: [newAtt] };
    }

    if (normalizedText.includes('SELECT a.*, s.student_id, s.name FROM attendance a JOIN students s')) {
        let results = (db.attendance || []).map(a => {
            const s = db.students.find(st => st.id === a.student_id);
            return { ...a, student_id: s ? s.student_id : null, name: s ? s.name : null, section: s ? s.section : null, batch: s ? s.batch : null };
        });
        const courseIdMatch = normalizedText.match(/a\.course_id\s*=\s*\$(\d+)/);
        if (courseIdMatch) results = results.filter(r => r.course_id === parseInt(params[parseInt(courseIdMatch[1]) - 1]));
        const dateMatch = normalizedText.match(/a\.date\s*=\s*\$(\d+)/);
        if (dateMatch) results = results.filter(r => r.date === params[parseInt(dateMatch[1]) - 1]);
        return { rows: results };
    }

    if (normalizedText.includes('DELETE FROM attendance WHERE id =')) {
        const id = parseInt(params[0]), idx = (db.attendance || []).findIndex(a => a.id === id);
        if (idx !== -1) { db.attendance.splice(idx, 1); writeJsonDb(db); return { rows: [{ id }] }; }
        return { rows: [] };
    }

    if (normalizedText.includes('UPDATE attendance SET') && normalizedText.includes('RETURNING *')) {
        const id = parseInt(params[params.length - 1]), idx = (db.attendance || []).findIndex(a => a.id === id);
        if (idx !== -1) {
            if (params[0] !== undefined) db.attendance[idx].status = params[0];
            if (params[1] !== undefined) db.attendance[idx].notes = params[1];
            db.attendance[idx].marked_at = new Date().toISOString();
            writeJsonDb(db);
            return { rows: [db.attendance[idx]] };
        }
        return { rows: [] };
    }

    if (normalizedText.includes('INSERT INTO canva_templates') && normalizedText.includes('RETURNING *')) {
        const newTmpl = {
            id: (db.canva_templates || []).reduce((max, t) => Math.max(max, t.id || 0), 0) + 1,
            name: params[0],
            template_type: params[1],
            canva_template_id: params[2],
            canva_design_id: params[3] || null,
            variables: params[4] || [],
            is_active: true,
            created_by: params[5] || null,
            created_at: new Date().toISOString()
        };
        db.canva_templates.push(newTmpl);
        writeJsonDb(db);
        return { rows: [newTmpl] };
    }

    if (normalizedText.includes('SELECT * FROM canva_templates')) {
        let results = [...(db.canva_templates || [])];
        const typeMatch = normalizedText.match(/template_type\s*=\s*\$(\d+)/);
        if (typeMatch) results = results.filter(t => t.template_type === params[parseInt(typeMatch[1]) - 1]);
        const activeMatch = normalizedText.match(/is_active\s*=\s*\$(\d+)/);
        if (activeMatch) results = results.filter(t => t.is_active === (params[parseInt(activeMatch[1]) - 1] === true || params[parseInt(activeMatch[1]) - 1] === 'true'));
        return { rows: results };
    }

    if (normalizedText.includes('SELECT students.id, students.student_id, students.name, students.section, students.batch FROM students')) {
        let results = db.students.filter(s => s.is_active);
        return { rows: results };
    }

    return null;
}

module.exports = { handle };
