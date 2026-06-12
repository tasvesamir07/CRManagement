const express = require('express');
const router = express.Router();
const templateService = require('../services/template.service');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const templates = await templateService.getTemplates(req.user.id);
        return res.json(templates);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const template = await templateService.getTemplateById(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        return res.json(template);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, category, title_template, content_template, variables } = req.body;
        if (!name || !title_template || !content_template) {
            return res.status(400).json({ error: 'name, title_template, and content_template are required' });
        }
        const template = await templateService.createTemplate({
            name, description, category, title_template, content_template, variables,
            created_by: req.user.id
        });
        return res.status(201).json(template);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, description, category, title_template, content_template, variables } = req.body;
        const template = await templateService.updateTemplate(req.params.id, { name, description, category, title_template, content_template, variables });
        return res.json(template);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await templateService.deleteTemplate(req.params.id);
        return res.json({ message: 'Template deleted' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
