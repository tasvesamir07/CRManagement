function handle(text, params, db, { writeJsonDb }) {
    if (text.includes('SELECT COUNT(*) FROM announcements')) {
        let filtered = [...db.announcements];
        if (text.includes('a.status =')) { const m = text.match(/a\.status\s*=\s*\$(\d+)/); if (m) filtered = filtered.filter(a => a.status === params[parseInt(m[1]) - 1]); }
        if (text.includes('a.course_id =')) { const m = text.match(/a\.course_id\s*=\s*\$(\d+)/); if (m) filtered = filtered.filter(a => a.course_id === parseInt(params[parseInt(m[1]) - 1])); }
        if (text.includes('a.created_by =')) { const m = text.match(/a\.created_by\s*=\s*\$(\d+)/); if (m) filtered = filtered.filter(a => a.created_by === parseInt(params[parseInt(m[1]) - 1])); }
        if (text.includes('ILIKE')) { const m = text.match(/\(a\.title\s+ILIKE\s+\$(\d+)/); if (m) { const p = params[parseInt(m[1]) - 1].replace(/%/g, ''); filtered = filtered.filter(a => (a.title || '').toLowerCase().includes(p.toLowerCase()) || (a.content || '').toLowerCase().includes(p.toLowerCase())); } }
        if (text.includes('a.created_at >=')) { const m = text.match(/a\.created_at\s*>=\s*\$(\d+)/); if (m) filtered = filtered.filter(a => new Date(a.created_at) >= new Date(params[parseInt(m[1]) - 1])); }
        if (text.includes('a.created_at <=')) { const m = text.match(/a\.created_at\s*<=\s*\$(\d+)/); if (m) filtered = filtered.filter(a => new Date(a.created_at) <= new Date(params[parseInt(m[1]) - 1])); }
        return { rows: [{ count: filtered.length }] };
    }
    if (text.includes('INSERT INTO announcements')) {
        let newAnnouncement;
        if (text.includes('file_ids')) {
            newAnnouncement = {
                id: db.announcements.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1,
                title: params[0], content: params[1], category: params[2] || null,
                course_id: params[3] ? parseInt(params[3]) : null, custom_room: params[4] || null, custom_time: params[5] || null,
                file_id: params[6] ? parseInt(params[6]) : null, file_ids: params[7] || [],
                created_by: parseInt(params[8]), status: params[9] || 'draft', scheduled_at: null, sent_at: null,
                metadata: params[10] ? (typeof params[10] === 'string' ? JSON.parse(params[10]) : params[10]) : null,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            };
        } else {
            newAnnouncement = {
                id: db.announcements.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1,
                title: params[0], content: params[1], category: params[2] || null,
                course_id: params[3] ? parseInt(params[3]) : null, custom_room: params[4] || null, custom_time: params[5] || null,
                file_id: params[6] ? parseInt(params[6]) : null, file_ids: params[6] ? [parseInt(params[6])] : [],
                created_by: parseInt(params[7]), status: params[8] || 'draft', scheduled_at: params[9] || null, sent_at: null,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            };
        }
        db.announcements.push(newAnnouncement); writeJsonDb(db);
        return { rows: [newAnnouncement] };
    }
    if (text.includes('SELECT a.*, c.course_id as c_id, c.course_name')) {
        if (text.includes('scheduled_at <= NOW()')) {
            const now = new Date().toISOString();
            const filtered = db.announcements.filter(a => a.status === 'scheduled' && a.scheduled_at && new Date(a.scheduled_at) <= new Date(now));
            const list = filtered.map(a => { const c = db.courses.find(course => course.id === a.course_id); return { ...a, c_id: c ? c.course_id : null, course_name: c ? c.course_name : null }; });
            list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { rows: list };
        }
        let annList = [...db.announcements];
        const idMatch = text.match(/a\.id\s*=\s*\$(\d+)/i);
        if (idMatch) annList = annList.filter(a => a.id === parseInt(params[parseInt(idMatch[1]) - 1]));
        const memberUserIdMatch = text.match(/course_members\s+WHERE\s+user_id\s*=\s*\$(\d+)/i);
        if (memberUserIdMatch) {
            const userId = parseInt(params[parseInt(memberUserIdMatch[1]) - 1]);
            const userCourseIds = db.course_members.filter(cm => cm.user_id === userId).map(cm => cm.course_id);
            annList = annList.filter(a => (a.course_id && userCourseIds.includes(a.course_id)) || a.created_by === userId);
        } else {
            const createdByMatch = text.match(/a\.created_by\s*=\s*\$(\d+)/);
            if (createdByMatch) annList = annList.filter(a => a.created_by === parseInt(params[parseInt(createdByMatch[1]) - 1]));
        }
        const list = annList.map(a => {
            const c = db.courses.find(course => course.id === a.course_id);
            const f = db.files.find(file => file.id === a.file_id);
            const u = db.users.find(user => user.id === a.created_by);
            return { ...a, c_id: c ? c.course_id : null, course_name: c ? c.course_name : null, file_name: f ? f.original_name : null, created_by_name: u ? u.display_name : null };
        });
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: list };
    }
    if (text.match(/SELECT\s+.+\s+FROM announcements WHERE id\s*=\s*\$?\d*/i)) {
        const id = parseInt(params[0]);
        let ann = null;
        for (let i = db.announcements.length - 1; i >= 0; i--) { if (db.announcements[i].id === id) { ann = db.announcements[i]; break; } }
        return { rows: ann ? [ann] : [] };
    }
    if (text.includes('UPDATE announcements SET scheduled_at =')) {
        const id = parseInt(params[2]);
        let idx = -1; for (let i = db.announcements.length - 1; i >= 0; i--) { if (db.announcements[i].id === id) { idx = i; break; } }
        if (idx !== -1) { db.announcements[idx].scheduled_at = params[0]; db.announcements[idx].status = params[1]; db.announcements[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.announcements[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE announcements SET title')) {
        const id = parseInt(params[9]);
        let idx = -1; for (let i = db.announcements.length - 1; i >= 0; i--) { if (db.announcements[i].id === id) { idx = i; break; } }
        if (idx !== -1) { db.announcements[idx].title = params[0]; db.announcements[idx].content = params[1]; db.announcements[idx].category = params[2]; db.announcements[idx].course_id = params[3] ? parseInt(params[3]) : null; db.announcements[idx].custom_room = params[4] || null; db.announcements[idx].custom_time = params[5] || null; db.announcements[idx].file_id = params[6] ? parseInt(params[6]) : null; db.announcements[idx].file_ids = params[7] || []; db.announcements[idx].metadata = params[8] ? (typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8]) : null; db.announcements[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.announcements[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE announcements SET status =')) {
        let status, id;
        if (params.length === 2) { status = params[0]; id = parseInt(params[1]); }
        else if (params.length === 1) { const m = text.match(/SET\s+status\s*=\s*'(\w+)'/i); status = m ? m[1] : 'unknown'; id = parseInt(params[0]); }
        let idx = -1; for (let i = db.announcements.length - 1; i >= 0; i--) { if (db.announcements[i].id === id) { idx = i; break; } }
        if (idx !== -1 && id) { db.announcements[idx].status = status; if (text.includes('sent_at = NOW()')) db.announcements[idx].sent_at = new Date().toISOString(); db.announcements[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.announcements[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('DELETE FROM announcements WHERE id =')) {
        const id = parseInt(params[0]);
        let idx = -1; for (let i = db.announcements.length - 1; i >= 0; i--) { if (db.announcements[i].id === id) { idx = i; break; } }
        if (idx !== -1) { db.announcements.splice(idx, 1); db.announcement_platforms = db.announcement_platforms.filter(ap => ap.announcement_id !== id); writeJsonDb(db); return { rows: [{ id }] }; }
        return { rows: [] };
    }
    if (text.includes('DELETE FROM announcement_platforms')) {
        if (text.includes('platform_id = ANY') || text.includes('platform_id = any')) {
            const ids = params[0]; db.announcement_platforms = db.announcement_platforms.filter(ap => !ids.includes(ap.platform_id)); writeJsonDb(db); return { rows: ids.map(id => ({ platform_id: id })) };
        } else if (text.includes('platform_id =')) {
            const platId = parseInt(params[0]); db.announcement_platforms = db.announcement_platforms.filter(ap => ap.platform_id !== platId); writeJsonDb(db); return { rows: [{ platform_id: platId }] };
        } else {
            const annId = parseInt(params[0]);
            if (text.includes("platform_status != 'sent'") || text.includes("platform_status <> 'sent'")) db.announcement_platforms = db.announcement_platforms.filter(ap => ap.announcement_id !== annId || ap.platform_status === 'sent');
            else db.announcement_platforms = db.announcement_platforms.filter(ap => ap.announcement_id !== annId);
            writeJsonDb(db); return { rows: [{ announcement_id: annId }] };
        }
    }
    if (text.includes('SELECT platform_id FROM announcement_platforms')) {
        const annId = parseInt(params[0]);
        const statusMatch = text.match(/platform_status\s*=\s*'(\w+)'/i);
        const status = statusMatch ? statusMatch[1] : null;
        return { rows: db.announcement_platforms.filter(ap => ap.announcement_id === annId && (!status || ap.platform_status === status)).map(ap => ({ platform_id: ap.platform_id })) };
    }
    if (text.includes('INSERT INTO announcement_platforms')) {
        const ap = { announcement_id: parseInt(params[0]), platform_id: parseInt(params[1]), platform_status: params[2] || 'pending', error_message: params[3] || null, sent_at: params[4] || null };
        const idx = db.announcement_platforms.findIndex(x => x.announcement_id === ap.announcement_id && x.platform_id === ap.platform_id);
        if (idx !== -1) db.announcement_platforms[idx] = ap; else db.announcement_platforms.push(ap);
        writeJsonDb(db); return { rows: [ap] };
    }
    if (text.includes('SELECT ap.*, p.platform_name')) {
        const annIds = text.includes('ANY(') ? (params[0] || []) : [parseInt(params[0])];
        return { rows: db.announcement_platforms.filter(ap => annIds.includes(ap.announcement_id)).map(ap => { const p = db.platforms.find(plat => plat.id === ap.platform_id); return { ...ap, platform_name: p ? p.platform_name : 'Unknown', platform_type: p ? p.platform_type : 'unknown', chat_id: p ? p.chat_id : '', is_active: p ? (p.is_active !== false) : true }; }) };
    }
    if (text.includes('UPDATE announcement_platforms SET platform_status =')) {
        let status, errorMsg, annId, platId, sentAt;
        if (text.includes('error_message =')) { status = params[0]; errorMsg = params[1]; annId = parseInt(params[2]); platId = parseInt(params[3]); }
        else { status = params[0]; errorMsg = null; annId = parseInt(params[1]); platId = parseInt(params[2]); if (status === 'sent') sentAt = new Date().toISOString(); }
        const idx = db.announcement_platforms.findIndex(ap => ap.announcement_id === annId && ap.platform_id === platId);
        if (idx !== -1) { db.announcement_platforms[idx].platform_status = status; db.announcement_platforms[idx].error_message = errorMsg; if (sentAt) db.announcement_platforms[idx].sent_at = sentAt; writeJsonDb(db); return { rows: [db.announcement_platforms[idx]] }; }
        return { rows: [] };
    }
    return null;
}

module.exports = { handle };
