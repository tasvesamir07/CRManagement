const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const announcementService = require('../services/announcement.service');
const authMiddleware = require('../middleware/auth.middleware');

const sendLimiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { error: 'Please wait before sending another broadcast. Only 1 send per 5 seconds allowed.' },
    standardHeaders: true,
    legacyHeaders: false
});

router.get('/', authMiddleware, async (req, res) => {
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

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, content, category, course_id, custom_room, custom_time, file_id, file_ids, platform_ids } = req.body;
        
        if (!title || !content || !category) {
            return res.status(400).json({ error: 'title, content, and category are required' });
        }
        
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
            platform_ids
        });
        
        return res.status(201).json(announcement);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
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

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, content, category, course_id, custom_room, custom_time, file_id, file_ids, platform_ids } = req.body;
        if (!title || !content || !category) {
            return res.status(400).json({ error: 'title, content, and category are required' });
        }
        const announcement = await announcementService.updateAnnouncement(req.params.id, {
            title, content, category, course_id, custom_room, custom_time, file_id, file_ids, platform_ids
        });
        return res.json(announcement);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/:id/schedule', authMiddleware, async (req, res) => {
    try {
        const { scheduled_at } = req.body;
        if (!scheduled_at) {
            return res.status(400).json({ error: 'scheduled_at is required' });
        }
        const announcement = await announcementService.scheduleAnnouncement(req.params.id, scheduled_at);
        return res.json(announcement);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/:id/send', authMiddleware, sendLimiter, async (req, res) => {
    try {
        const ann = await announcementService.getAnnouncementById(req.params.id);
        if (!ann) return res.status(404).json({ error: 'Announcement not found' });

        const totalFiles = (ann.file_ids?.length || (ann.file_id ? 1 : 0));
        const totalPlatforms = ann.delivery?.length || 0;

        if (totalFiles > 0 && totalFiles * totalPlatforms > 10) {
            return res.status(400).json({
                error: 'Large broadcast detected. Please schedule instead of sending immediately.',
                hint: 'This announcement has many file attachments and platforms. Use the schedule feature.'
            });
        }

        if (req.body.confirmed !== true) {
            return res.status(400).json({
                error: 'Please confirm the broadcast by setting confirmed: true in the request body.',
                platformCount: totalPlatforms,
                fileCount: totalFiles
            });
        }

        const hostUrl = `${req.protocol}://${req.get('host')}`;
        const result = await announcementService.sendAnnouncement(req.params.id, hostUrl);
        return res.json(result);
    } catch (err) {
        console.error('Send announcement route error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

router.post('/draft-ai', authMiddleware, async (req, res) => {
    try {
        const { prompt, category } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'prompt is required' });
        }

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
        console.error('Draft announcement AI error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
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
