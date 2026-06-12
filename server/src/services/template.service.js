const db = require('../config/database');

async function getTemplates(userId = null) {
    let query = 'SELECT * FROM announcement_templates WHERE is_active = true';
    const params = [];
    if (userId) {
        query += ' AND (created_by = $1 OR created_by IS NULL)';
        params.push(userId);
    }
    query += ' ORDER BY name ASC';
    const result = await db.query(query, params);
    return result.rows;
}

async function getTemplateById(id) {
    const result = await db.query('SELECT * FROM announcement_templates WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function createTemplate({ name, description, category, title_template, content_template, variables, created_by }) {
    const result = await db.query(
        'INSERT INTO announcement_templates (name, description, category, title_template, content_template, variables, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, description || '', category || 'notice', title_template, content_template, variables || [], created_by]
    );
    return result.rows[0];
}

async function updateTemplate(id, { name, description, category, title_template, content_template, variables }) {
    const result = await db.query(
        'UPDATE announcement_templates SET name=$1, description=$2, category=$3, title_template=$4, content_template=$5, variables=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
        [name, description, category, title_template, content_template, variables, id]
    );
    if (result.rows.length === 0) throw new Error('Template not found');
    return result.rows[0];
}

async function deleteTemplate(id) {
    const result = await db.query('UPDATE announcement_templates SET is_active = false WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
}

module.exports = {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate
};
