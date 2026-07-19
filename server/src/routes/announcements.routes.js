const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const announcementService = require('../services/announcement.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateQuery, validateParams, schemas } = require('../middleware/validate.middleware');
const logger = require('../config/logger');

const sendLimiter = rateLimit({
    windowMs: 5 * 1000,
    max: 3,
    message: { error: 'Please wait before sending another broadcast. Only 3 sends per 5 seconds allowed.' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * @openapi
 * /announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: List announcements
 *     description: Get paginated list of announcements with filtering. CRs see their own, admins see all.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, scheduled, sending, sent, partial, failed] }
 *       - in: query
 *         name: course_id
 *         schema: { type: integer }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated list of announcements with delivery status
 */
router.get('/', authMiddleware, validateQuery(schemas.announcements.listQuery), async (req, res) => {
    try {
        const { page, limit, search, status, course_id, date_from, date_to } = req.query;
        const result = await announcementService.getAnnouncements({
            page: parseInt(page) || 1,
            limit: Math.min(parseInt(limit) || 50, 100),
            search,
            status,
            course_id,
            date_from,
            date_to,
            userId: req.user.role === 'admin' ? null : req.user.id
        });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /announcements:
 *   post:
 *     tags: [Announcements]
 *     summary: Create a new announcement draft
 *     description: Creates a draft announcement with optional file attachments and target platforms.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, category]
 *             properties:
 *               title: { type: string, maxLength: 300 }
 *               content: { type: string }
 *               category: { type: string, maxLength: 50 }
 *               course_id: { type: integer, nullable: true }
 *               custom_room: { type: string, nullable: true }
 *               custom_time: { type: string, nullable: true }
 *               file_id: { type: integer, nullable: true }
 *               file_ids: { type: array, items: { type: integer } }
 *               platform_ids: { type: array, items: { type: integer } }
 *               metadata: { type: object }
 *     responses:
 *       201:
 *         description: Announcement created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, validate(schemas.announcements.create), async (req, res) => {
    try {
        const { title, content, category, course_id, custom_room, custom_time, file_id, file_ids, platform_ids, metadata } = req.body;
        
        const announcement = await announcementService.createAnnouncement({
            title,
            content,
            category,
            course_id,
            custom_room,
            custom_time,
            file_id,
            file_ids,
            created_by: req.user.id,
            platform_ids,
            metadata
        });
        
        return res.status(201).json(announcement);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /announcements/{id}:
 *   get:
 *     tags: [Announcements]
 *     summary: Get announcement details
 *     description: Returns announcement with delivery status per platform and attached files.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Announcement details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       404:
 *         description: Not found
 */
router.get('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const announcement = await announcementService.getAnnouncementById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        return res.json(announcement);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /announcements/{id}:
 *   put:
 *     tags: [Announcements]
 *     summary: Update an announcement
 *     description: Only draft, scheduled, partial, and failed announcements can be edited. Already-sent platforms are preserved.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, maxLength: 300 }
 *               content: { type: string }
 *               category: { type: string, maxLength: 50 }
 *               course_id: { type: integer, nullable: true }
 *               custom_room: { type: string, nullable: true }
 *               custom_time: { type: string, nullable: true }
 *               file_id: { type: integer, nullable: true }
 *               file_ids: { type: array, items: { type: integer } }
 *               platform_ids: { type: array, items: { type: integer } }
 *               metadata: { type: object }
 *     responses:
 *       200:
 *         description: Updated announcement
 *       400:
 *         description: Cannot edit sent announcement
 */
router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.announcements.update), async (req, res) => {
    try {
        const { title, content, category, course_id, custom_room, custom_time, file_id, file_ids, platform_ids, metadata } = req.body;
        const announcement = await announcementService.updateAnnouncement(req.params.id, {
            title, content, category, course_id, custom_room, custom_time, file_id, file_ids, platform_ids, metadata
        });
        return res.json(announcement);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /announcements/{id}/schedule:
 *   post:
 *     tags: [Announcements]
 *     summary: Schedule an announcement
 *     description: Sets the scheduled_at timestamp. The server will broadcast at that time.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduled_at]
 *             properties:
 *               scheduled_at: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Announcement scheduled
 *       400:
 *         description: Validation error
 */
router.post('/:id/schedule', authMiddleware, validateParams(schemas.params.id), validate(schemas.announcements.schedule), async (req, res) => {
    try {
        const { scheduled_at } = req.body;
        const announcement = await announcementService.scheduleAnnouncement(req.params.id, scheduled_at);
        return res.json(announcement);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /announcements/{id}/send:
 *   post:
 *     tags: [Announcements]
 *     summary: Send/broadcast an announcement
 *     description: Immediately broadcasts to all selected platforms. Requires confirmed:true. Rate limited to 3 per 5s.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [confirmed]
 *             properties:
 *               confirmed: { type: boolean, enum: [true] }
 *     responses:
 *       200:
 *         description: Broadcast completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 announcement:
 *                   $ref: '#/components/schemas/Announcement'
 *                 successCount: { type: integer }
 *                 failureCount: { type: integer }
 *       400:
 *         description: Confirmation required or large broadcast
 */
router.post('/:id/send', authMiddleware, validateParams(schemas.params.id), sendLimiter, validate(schemas.announcements.send), async (req, res) => {
    try {
        const ann = await announcementService.getAnnouncementById(req.params.id);
        if (!ann) return res.status(404).json({ error: 'Announcement not found' });

        const totalFiles = (ann.file_ids?.length || (ann.file_id ? 1 : 0));
        const totalPlatforms = ann.delivery?.filter(d => d.platform_status !== 'sent').length || 0;

        if (totalFiles > 0 && totalFiles * totalPlatforms > 25) {
            return res.status(400).json({
                error: 'Large broadcast detected. Please schedule instead of sending immediately.',
                hint: 'This announcement has many file attachments and remaining target channels. Use the schedule feature.'
            });
        }

        const hostUrl = `${req.protocol}://${req.get('host')}`;
        const result = await announcementService.sendAnnouncement(req.params.id, hostUrl);
        return res.json(result);
    } catch (err) {
        logger.error({ err }, 'Send announcement route error');
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /announcements/draft-ai:
 *   post:
 *     tags: [Announcements]
 *     summary: Generate AI draft for announcement
 *     description: Uses Gemini API to draft an announcement message. Falls back to a template if GEMINI_API_KEY is not set.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string, maxLength: 2000 }
 *               category: { type: string, maxLength: 50 }
 *     responses:
 *       200:
 *         description: AI-generated draft text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 draft: { type: string }
 */
router.post('/draft-ai', authMiddleware, validate(schemas.announcements.draftAI), async (req, res) => {
    try {
        const { prompt, category } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            const categoryLabel = category ? category.toUpperCase().replace('_', ' ') : 'GENERAL ANNOUNCEMENT';
            const fallbackDraft = `📢 *Notice: ${categoryLabel}*\n\n` +
                `This is a fallback generated draft for: "${prompt}".\n` +
                `(Configure GEMINI_API_KEY in your .env file to enable live AI notice drafting!)\n\n` +
                `📅 *Date:* [Date]\n` +
                `⏰ *Time:* [Time]\n` +
                `🏫 *Location:* [Room / Venue]\n\n` +
                `Please be prepared and attend on time. Good luck! 🍀`;
            return res.json({ draft: fallbackDraft });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `Draft a formal, structured notice based on this request. Prompt: "${prompt}". Category: ${category || 'general'}`
                            }
                        ]
                    }
                ],
                systemInstruction: {
                    parts: [
                        {
                            text: "You are an assistant for a Class Representative (CR) drafting announcement messages to students for Telegram and WhatsApp. Make them professional yet friendly. Use markdown format: asterisks (*) for bold titles/fields and bold inline items (e.g. *Time:* 10:00 AM, *Date:* 12/06/2026). Use bullet points and appropriate emojis (e.g., 📢, 📝, 📅, ⏰, 🏫, ⚠️). Keep it concise, clear, and structured so it is easy to read. Do NOT use markdown headers like '#' or '##' since WhatsApp/Telegram do not support them. Output only the message text itself, no explanations."
                        }
                    ]
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API returned error: ${errBody}`);
        }

        const data = await response.json();
        const draftText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate draft content.';
        return res.json({ draft: draftText.trim() });
    } catch (err) {
        logger.error({ err }, 'Draft announcement AI error');
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /announcements/{id}:
 *   delete:
 *     tags: [Announcements]
 *     summary: Delete an announcement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.delete('/:id', authMiddleware, validateParams(schemas.params.id), async (req, res) => {
    try {
        const deleted = await announcementService.deleteAnnouncement(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        return res.json({ message: 'Announcement deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;