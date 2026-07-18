const express = require('express');
const router = express.Router();
const canvaService = require('../services/canva.service');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const db = require('../config/database');
const { validate, schemas } = require('../middleware/validate.middleware');
const crypto = require('crypto');

router.get('/auth', authMiddleware, async (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');

    await db.query(
      'INSERT INTO canva_oauth_states (user_id, state, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')',
      [req.user.id, state]
    );

    const url = canvaService.getAuthorizationUrl(state);

    res.json({ url, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const result = await db.query(
      'SELECT * FROM canva_oauth_states WHERE state = $1 AND expires_at > NOW() LIMIT 1',
      [state]
    );
    const rows = result.rows;

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    await db.query('DELETE FROM canva_oauth_states WHERE state = $1', [state]);

    const tokens = await canvaService.exchangeCode(code);

    await db.query(
      'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [`canva_tokens_${rows[0].user_id}`, JSON.stringify(tokens)]
    );

    res.redirect('/settings?canva=connected');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM canva_templates WHERE is_active = true ORDER BY created_at DESC'
    );
    const rows = result.rows;

    res.json({ templates: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', authMiddleware, validate(schemas.canva.saveTemplate), async (req, res) => {
  try {
    const { canva_template_id, name, dataset } = req.body;

    const result = await db.query(
      'INSERT INTO canva_templates (user_id, canva_template_id, name, dataset, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
      [req.user.id, canva_template_id, name, dataset ? JSON.stringify(dataset) : null]
    );

    res.status(201).json({ id: result.rows[0].id, canva_template_id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates/:id/dataset', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM canva_templates WHERE id = $1 AND is_active = true LIMIT 1',
      [req.params.id]
    );
    const templates = result.rows;

    if (!templates.length) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    const settingsResult = await db.query(
      'SELECT value FROM system_settings WHERE key = $1 LIMIT 1',
      [`canva_tokens_${req.user.id}`]
    );
    const settings = settingsResult.rows;

    if (!settings.length) {
      return res.status(401).json({ error: 'Canva not connected. Please authenticate first.' });
    }

    const tokens = JSON.parse(settings[0].value);
    const dataset = await canvaService.getTemplateDataset(template.canva_template_id, tokens);

    res.json({ dataset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-pdf', authMiddleware, validate(schemas.canva.generatePdf), async (req, res) => {
  try {
    const { template_id, data } = req.body;

    const result = await db.query(
      'SELECT * FROM canva_templates WHERE id = $1 AND is_active = true LIMIT 1',
      [template_id]
    );
    const templates = result.rows;

    if (!templates.length) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    const settingsResult = await db.query(
      'SELECT value FROM system_settings WHERE key = $1 LIMIT 1',
      [`canva_tokens_${req.user.id}`]
    );
    const settings = settingsResult.rows;

    if (!settings.length) {
      return res.status(401).json({ error: 'Canva not connected. Please authenticate first.' });
    }

    const tokens = JSON.parse(settings[0].value);
    const pdfBuffer = await canvaService.generatePdfFromTemplate(template.canva_template_id, data, tokens);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${template.name || 'document'}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
