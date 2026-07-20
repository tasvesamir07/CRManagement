const express = require('express');
const router = express.Router();
const templateService = require('../services/template.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /templates:
 *   get:
 *     tags: [Templates]
 *     summary: List all templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of templates
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const templates = await templateService.getTemplates(req.user.id);
        return res.json(templates);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /templates/{id}:
 *   get:
 *     tags: [Templates]
 *     summary: Get a template by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template object
 *       404:
 *         description: Template not found
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const template = await templateService.getTemplateById(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        return res.json(template);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /templates:
 *   post:
 *     tags: [Templates]
 *     summary: Create a new template
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               title_template:
 *                 type: string
 *               content_template:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Template created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, validate(schemas.templates.create), async (req, res) => {
    try {
        const { name, description, category, title_template, content_template, variables } = req.body;
        const template = await templateService.createTemplate({
            name, description, category, title_template, content_template, variables,
            created_by: req.user.id
        });
        return res.status(201).json(template);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /templates/{id}:
 *   put:
 *     tags: [Templates]
 *     summary: Update a template
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               title_template:
 *                 type: string
 *               content_template:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Template updated
 *       400:
 *         description: Validation error
 */
router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.templates.update), async (req, res) => {
    try {
        const { name, description, category, title_template, content_template, variables } = req.body;
        const template = await templateService.updateTemplate(req.params.id, { name, description, category, title_template, content_template, variables });
        return res.json(template);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /templates/{id}:
 *   delete:
 *     tags: [Templates]
 *     summary: Delete a template
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        await templateService.deleteTemplate(req.params.id);
        return res.json({ message: 'Template deleted' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
