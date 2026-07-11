function handle(text, params, db, { writeJsonDb }) {
    // Audit logs
    if (text.includes('INSERT INTO audit_logs')) {
        const newLog = { id: db.audit_logs.reduce((max, l) => Math.max(max, l.id || 0), 0) + 1, user_id: parseInt(params[0]), action: params[1], entity_type: params[2] || null, entity_id: params[3] ? parseInt(params[3]) : null, details: params[4] || null, ip_address: params[5] || null, created_at: new Date().toISOString() };
        db.audit_logs.push(newLog); writeJsonDb(db); return { rows: [newLog] };
    }
    if (text.includes('FROM audit_logs al') || text.includes('FROM audit_logs')) {
        if (text.includes('COUNT(*)')) return { rows: [{ count: db.audit_logs.length }] };
        const logs = [...db.audit_logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(log => { const u = db.users.find(user => user.id === log.user_id); return { ...log, username: u ? u.username : null, display_name: u ? u.display_name : null }; });
        return { rows: logs };
    }
    if (text.includes('DELETE FROM audit_logs')) {
        if (text.includes('id =') && text.includes('user_id =')) { const id = parseInt(params[0]), userId = parseInt(params[1]), idx = db.audit_logs.findIndex(l => l.id === id && l.user_id === userId); if (idx !== -1) { const deleted = db.audit_logs[idx]; db.audit_logs.splice(idx, 1); writeJsonDb(db); return { rows: [deleted] }; } return { rows: [] }; }
        else if (text.includes('id =')) { const id = parseInt(params[0]), idx = db.audit_logs.findIndex(l => l.id === id); if (idx !== -1) { const deleted = db.audit_logs[idx]; db.audit_logs.splice(idx, 1); writeJsonDb(db); return { rows: [deleted] }; } return { rows: [] }; }
        else if (text.includes('user_id =')) { const userId = parseInt(params[0]); db.audit_logs = db.audit_logs.filter(l => l.user_id !== userId); writeJsonDb(db); return { rows: [] }; }
        else { db.audit_logs = []; writeJsonDb(db); return { rows: [] }; }
    }

    // Analytics events
    if (text.includes('INSERT INTO analytics_events')) {
        const newEvent = { id: db.analytics_events.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1, event_type: params[0], user_id: params[1] ? parseInt(params[1]) : null, metadata: params[2] || null, created_at: new Date().toISOString() };
        db.analytics_events.push(newEvent); writeJsonDb(db); return { rows: [newEvent] };
    }
    if (text.includes('FROM analytics_events')) {
        if (text.includes('COUNT(*)')) return { rows: [{ count: db.analytics_events.length }] };
        let filtered = [...db.analytics_events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (text.includes('event_type =')) { const m = text.match(/\$(\d+)/); if (m) filtered = filtered.filter(e => e.event_type === params[parseInt(m[1]) - 1]); }
        return { rows: filtered };
    }

    // Aggregation queries
    if (text.includes('DATE(created_at)')) {
        const groups = {}; for (const a of db.announcements) { const d = new Date(a.created_at).toISOString().split('T')[0]; groups[d] = (groups[d] || 0) + 1; }
        return { rows: Object.entries(groups).map(([date, count]) => ({ date, count: String(count) })).sort((a, b) => a.date.localeCompare(b.date)) };
    }
    if (text.includes('announcement_platforms ap') && text.includes('GROUP BY')) {
        const groups = {}; for (const ap of db.announcement_platforms) { const p = db.platforms.find(plat => plat.id === ap.platform_id); const key = `${p?.platform_type || 'unknown'}|${p?.platform_name || 'unknown'}|${ap.platform_status || 'unknown'}`; groups[key] = (groups[key] || 0) + 1; }
        return { rows: Object.entries(groups).map(([key, count]) => { const parts = key.split('|'); return { platform_type: parts[0], platform_name: parts[1], platform_status: parts[2], count: String(count) }; }) };
    }
    if (text.includes('JOIN announcements a ON a.created_by = u.id') && text.includes('GROUP BY')) {
        const userCounts = {}; for (const a of db.announcements) { const u = db.users.find(user => user.id === a.created_by); if (u) { userCounts[u.id] = userCounts[u.id] || { id: u.id, username: u.username, display_name: u.display_name, announcement_count: 0 }; userCounts[u.id].announcement_count++; } }
        return { rows: Object.values(userCounts).sort((a, b) => b.announcement_count - a.announcement_count).slice(0, 10) };
    }

    // Templates
    if (text.includes('FROM announcement_templates')) {
        if (text.includes('WHERE id =')) { const tpl = db.announcement_templates.find(t => t.id === parseInt(params[0]) && t.is_active); return { rows: tpl ? [tpl] : [] }; }
        let templates = [...db.announcement_templates].filter(t => t.is_active);
        const userMatch = text.match(/created_by\s*=\s*\$(\d+)/i);
        if (userMatch) { const userId = params[parseInt(userMatch[1]) - 1]; templates = templates.filter(t => t.created_by === userId || !t.created_by); }
        templates.sort((a, b) => a.name.localeCompare(b.name));
        return { rows: templates };
    }
    if (text.includes('INSERT INTO announcement_templates')) {
        const newTpl = { id: db.announcement_templates.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1, name: params[0], description: params[1] || '', category: params[2] || 'notice', title_template: params[3], content_template: params[4], variables: params[5] || [], is_active: true, created_by: params[6] || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db.announcement_templates.push(newTpl); writeJsonDb(db); return { rows: [newTpl] };
    }
    if (text.includes('UPDATE announcement_templates SET name=')) {
        const id = parseInt(params[6]); let idx = -1; for (let i = db.announcement_templates.length - 1; i >= 0; i--) { if (db.announcement_templates[i].id === id) { idx = i; break; } }
        if (idx !== -1) { db.announcement_templates[idx].name = params[0]; db.announcement_templates[idx].description = params[1]; db.announcement_templates[idx].category = params[2]; db.announcement_templates[idx].title_template = params[3]; db.announcement_templates[idx].content_template = params[4]; db.announcement_templates[idx].variables = params[5]; db.announcement_templates[idx].updated_at = new Date().toISOString(); writeJsonDb(db); return { rows: [db.announcement_templates[idx]] }; }
        return { rows: [] };
    }
    if (text.includes('UPDATE announcement_templates SET is_active = false')) {
        const id = parseInt(params[0]); let idx = -1; for (let i = db.announcement_templates.length - 1; i >= 0; i--) { if (db.announcement_templates[i].id === id) { idx = i; break; } }
        if (idx !== -1) { db.announcement_templates[idx].is_active = false; writeJsonDb(db); return { rows: [db.announcement_templates[idx]] }; }
        return { rows: [] };
    }

    // System settings + whatsapp_creds
    if (text.includes('SELECT value FROM system_settings WHERE key =')) {
        const matched = db.system_settings ? db.system_settings.find(s => s.key === params[0]) : null;
        return { rows: matched ? [{ value: matched.value }] : [] };
    }
    if (text.includes('INSERT INTO system_settings') || text.includes('UPDATE system_settings')) {
        if (!db.system_settings) db.system_settings = [];
        const existing = db.system_settings.find(s => s.key === params[0]);
        if (existing) { existing.value = params[1]; existing.updated_at = new Date().toISOString(); }
        else { db.system_settings.push({ key: params[0], value: params[1], updated_at: new Date().toISOString() }); }
        writeJsonDb(db); return { rowCount: 1 };
    }
    if (text.includes('SELECT * FROM system_settings')) {
        return { rows: [...(db.system_settings || [])] };
    }
    if (text.includes("key = 'whatsapp_creds'") || text.includes('SELECT data FROM whatsapp_creds')) {
        const existing = db.system_settings.find(s => s.key === 'whatsapp_creds');
        return { rows: existing ? [{ data: existing.value }] : [] };
    }
    if (text.includes('INSERT INTO whatsapp_creds')) {
        const existing = db.system_settings.find(s => s.key === 'whatsapp_creds');
        if (existing) { existing.value = JSON.stringify(params[0]); } else { db.system_settings.push({ key: 'whatsapp_creds', value: JSON.stringify(params[0]), updated_at: new Date().toISOString() }); }
        writeJsonDb(db); return { rows: [] };
    }
    if (text.includes('DELETE FROM whatsapp_creds')) {
        db.system_settings = db.system_settings.filter(s => s.key !== 'whatsapp_creds');
        writeJsonDb(db); return { rows: [] };
    }
    return null;
}

module.exports = { handle };
