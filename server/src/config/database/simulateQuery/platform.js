function handle(text, params, db, { writeJsonDb }) {
    if (text.includes('INSERT INTO platforms')) {
        const newPlatform = {
            id: db.platforms.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1,
            platform_name: params[0], platform_type: params[1], chat_id: params[2],
            description: params[3] || null, created_by: params[4] || null,
            course_id: params[5] ? parseInt(params[5]) : null,
            is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        db.platforms.push(newPlatform); writeJsonDb(db);
        return { rows: [newPlatform] };
    }
    if (text.includes('SELECT * FROM platforms WHERE 1=1') || text.includes('SELECT * FROM platforms WHERE is_active = true')) {
        let filtered = [...db.platforms];
        if (text.includes('is_active = true') || text.includes('is_active = TRUE')) filtered = filtered.filter(p => p.is_active);
        if (text.includes('AND created_by =')) filtered = filtered.filter(p => p.created_by === parseInt(params[0]));
        return { rows: filtered };
    }
    if (text.includes('UPDATE platforms SET is_active = false') || text.includes('UPDATE platforms SET is_active = FALSE')) {
        const id = parseInt(params[0]), idx = db.platforms.findIndex(p => p.id === id);
        if (idx !== -1) { db.platforms[idx].is_active = false; db.platforms[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.platforms[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('DELETE FROM platforms')) {
        if (text.includes('id = ANY') || text.includes('id = any')) {
            const ids = params[0];
            const deleted = [];
            db.platforms = db.platforms.filter(p => { if (ids.includes(p.id)) { deleted.push(p); return false; } return true; });
            writeJsonDb(db);
            return { rows: deleted.map(d => ({ id: d.id })) };
        }
        const id = parseInt(params[0]), idx = db.platforms.findIndex(p => p.id === id);
        if (idx !== -1) { const deletedPlatform = db.platforms[idx]; db.platforms.splice(idx, 1); writeJsonDb(db); return { rows: [deletedPlatform] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE platforms SET platform_name')) {
        const id = parseInt(params[4]), idx = db.platforms.findIndex(p => p.id === id);
        if (idx !== -1) { db.platforms[idx] = { ...db.platforms[idx], platform_name: params[0], platform_type: params[1], chat_id: params[2], description: params[3], updated_at: new Date().toISOString() }; writeJsonDb(db); return { rows: [db.platforms[idx]] }; }
        return { rows: [] };
    }
    return null;
}

module.exports = { handle };
