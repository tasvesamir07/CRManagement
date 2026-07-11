const fs = require('fs');
const path = require('path');

function handle(text, params, db, { writeJsonDb }) {
    if (text.includes('SUM(file_size)')) {
        let changed = false;
        const activeFiles = db.files.filter(f => {
            if (f.is_deleted) return false;
            const filePath = path.join(__dirname, '../../../../uploads', f.storage_path);
            if (!fs.existsSync(filePath)) { f.is_deleted = true; changed = true; return false; }
            return true;
        });
        if (changed) writeJsonDb(db);
        return { rows: [{ used_bytes: activeFiles.reduce((acc, file) => acc + (file.file_size || 0), 0) }] };
    }
    if (text.includes('INSERT INTO files')) {
        const newFile = {
            id: db.files.reduce((max, f) => Math.max(max, f.id || 0), 0) + 1,
            original_name: params[0], storage_path: params[1], file_type: params[2] || null,
            file_size: parseInt(params[3] || 0), uploaded_by: params[4] || null,
            expires_at: params[5] || null, folder_id: params[6] ? parseInt(params[6]) : null,
            uploaded_at: new Date().toISOString(), is_deleted: false
        };
        db.files.push(newFile); writeJsonDb(db);
        return { rows: [newFile] };
    }
    if (text.includes('SELECT * FROM files WHERE id =')) {
        if (text.includes('ANY(')) {
            const ids = params[0] || [];
            return { rows: db.files.filter(f => ids.includes(f.id) && !f.is_deleted) };
        }
        const file = db.files.find(f => f.id === parseInt(params[0]) && !f.is_deleted);
        return { rows: file ? [file] : [] };
    }
    if (text.includes('SELECT * FROM files WHERE folder_id =')) {
        return { rows: db.files.filter(f => f.folder_id === parseInt(params[0])) };
    }
    if (text.includes('UPDATE files SET is_deleted = true') || text.includes('UPDATE files SET is_deleted = TRUE')) {
        const idx = db.files.findIndex(f => f.id === parseInt(params[0]));
        if (idx !== -1) { db.files[idx].is_deleted = true; writeJsonDb(db); return { rows: [db.files[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('DELETE FROM files WHERE id =')) {
        const id = parseInt(params[0]);
        db.files = db.files.filter(f => f.id !== id); writeJsonDb(db);
        return { rowCount: 1 };
    }
    if (text.includes('UPDATE files SET expires_at =')) {
        const expiresAt = params[0] ? new Date(params[0]).toISOString() : null;
        const idx = db.files.findIndex(f => f.id === parseInt(params[1]));
        if (idx !== -1) { db.files[idx].expires_at = expiresAt; writeJsonDb(db); return { rows: [db.files[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE files SET storage_path')) {
        const idx = db.files.findIndex(f => f.id === parseInt(params[1]));
        if (idx !== -1) { db.files[idx].storage_path = params[0]; writeJsonDb(db); return { rows: [db.files[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE files SET folder_id =')) {
        const folderId = params[0] ? parseInt(params[0]) : null, ids = params[1] || [];
        db.files = db.files.map(f => ids.includes(f.id) ? { ...f, folder_id: folderId } : f);
        writeJsonDb(db);
        return { rowCount: ids.length };
    }
    if (text.includes('SELECT COUNT(*) FROM files')) {
        let list = db.files.filter(f => !f.is_deleted);
        if (text.includes('f.uploaded_by =')) { const m = text.match(/f\.uploaded_by\s*=\s*\$(\d+)/); if (m) list = list.filter(f => f.uploaded_by === params[parseInt(m[1]) - 1]); }
        if (text.includes('f.folder_id =')) { const m = text.match(/f\.folder_id\s*=\s*\$(\d+)/); if (m) list = list.filter(f => f.folder_id === params[parseInt(m[1]) - 1]); }
        else if (text.includes('f.folder_id IS NULL')) list = list.filter(f => !f.folder_id);
        if (text.includes('f.original_name ILIKE')) { const m = text.match(/f\.original_name\s+ILIKE\s*\$(\d+)/); if (m) { const q = params[parseInt(m[1]) - 1].replace(/%/g, '').toLowerCase(); list = list.filter(f => f.original_name.toLowerCase().includes(q)); } }
        return { rows: [{ count: list.length }] };
    }
    if (text.includes('SELECT f.*, u.display_name') || text.includes('SELECT f.* FROM files')) {
        let list = db.files.filter(f => !f.is_deleted);
        if (text.includes('f.uploaded_by =')) { const m = text.match(/f\.uploaded_by\s*=\s*\$(\d+)/); if (m) list = list.filter(f => f.uploaded_by === params[parseInt(m[1]) - 1]); }
        if (text.includes('f.folder_id =')) { const m = text.match(/f\.folder_id\s*=\s*\$(\d+)/); if (m) list = list.filter(f => f.folder_id === params[parseInt(m[1]) - 1]); }
        else if (text.includes('f.folder_id IS NULL')) list = list.filter(f => !f.folder_id);
        if (text.includes('f.original_name ILIKE')) { const m = text.match(/f\.original_name\s+ILIKE\s*\$(\d+)/); if (m) { const q = params[parseInt(m[1]) - 1].replace(/%/g, '').toLowerCase(); list = list.filter(f => f.original_name.toLowerCase().includes(q)); } }
        list.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
        const rows = list.map(f => { const u = db.users.find(user => user.id === f.uploaded_by); return { ...f, uploaded_by_name: u ? u.display_name : null, uploaded_by_username: u ? u.username : null }; });
        const limitMatch = text.match(/LIMIT\s+\$(\d+)/), offsetMatch = text.match(/OFFSET\s+\$(\d+)/);
        if (limitMatch && offsetMatch) { const l = params[parseInt(limitMatch[1]) - 1], o = params[parseInt(offsetMatch[1]) - 1]; return { rows: rows.slice(o, o + l) }; }
        return { rows };
    }
    if (text.includes('INSERT INTO folders')) {
        const newFolder = {
            id: db.folders.reduce((max, f) => Math.max(max, f.id || 0), 0) + 1,
            name: params[0], course_id: params[1] ? parseInt(params[1]) : null,
            created_by: params[2] ? parseInt(params[2]) : null, created_at: new Date().toISOString()
        };
        db.folders.push(newFolder); writeJsonDb(db);
        return { rows: [newFolder] };
    }
    if (text.includes('SELECT fo.*, c.course_name')) {
        const rows = db.folders.map(f => { const course = db.courses.find(c => c.id === f.course_id); return { ...f, course_name: course ? course.course_name : null, course_code: course ? course.course_id : null }; });
        rows.sort((a, b) => a.name.localeCompare(b.name));
        return { rows };
    }
    if (text.includes('SELECT id FROM folders WHERE course_id =')) {
        return { rows: db.folders.filter(f => f.course_id === parseInt(params[0])).map(f => ({ id: f.id })) };
    }
    if (text.includes('SELECT name FROM folders WHERE id =')) {
        const matched = db.folders.find(f => f.id === parseInt(params[0]));
        return { rows: matched ? [{ name: matched.name }] : [] };
    }
    if (text.includes('DELETE FROM folders WHERE id =')) {
        const id = parseInt(params[0]);
        db.folders = db.folders.filter(f => f.id !== id); db.files = db.files.filter(f => f.folder_id !== id);
        writeJsonDb(db);
        return { rowCount: 1 };
    }
    if (text.includes('SELECT * FROM folders WHERE course_id =')) {
        return { rows: db.folders.filter(f => f.course_id === parseInt(params[0])) };
    }
    if (text.includes('SELECT fo.* FROM folders fo WHERE fo.id =')) {
        const matched = db.folders.find(f => f.id === parseInt(params[0]));
        return { rows: matched ? [matched] : [] };
    }
    if (text.includes('SELECT * FROM folders')) {
        const whereId = text.match(/id\s*=\s*\$(\d+)/);
        if (whereId) return { rows: db.folders.filter(f => f.id === parseInt(params[parseInt(whereId[1]) - 1])) };
        return { rows: db.folders };
    }
    return null;
}

module.exports = { handle };
