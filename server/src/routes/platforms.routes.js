const express = require('express');
const router = express.Router();
const db = require('../config/database');
const whatsappService = require('../services/whatsapp.service');
const telegramService = require('../services/telegram.service');
const authMiddleware = require('../middleware/auth.middleware');

// Fetch registered platforms
router.get('/', authMiddleware, async (req, res) => {
    try {
        let query = 'SELECT * FROM platforms WHERE is_active = true';
        const params = [];
        if (req.user.role !== 'admin') {
            query += ' AND created_by = $1';
            params.push(req.user.id);
        }
        query += ' ORDER BY platform_name ASC';
        const result = await db.query(query, params);
        const platforms = result.rows.map(p => ({
            ...p,
            service_available: p.platform_type === 'telegram'
                ? !telegramService.isMock()
                : !whatsappService.getStatus().isMock
        }));
        return res.json(platforms);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Register new platform
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { platform_name, platform_type, chat_id, description } = req.body;
        if (!platform_name || !platform_type || !chat_id) {
            return res.status(400).json({ error: 'platform_name, platform_type, and chat_id are required' });
        }
        
        const result = await db.query(
            'INSERT INTO platforms (platform_name, platform_type, chat_id, description, created_by) \
             VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [platform_name, platform_type, chat_id, description || '', req.user.id]
        );
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Delete platform (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE platforms SET is_active = false WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Platform not found' });
        }
        return res.json({ message: 'Platform deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Request pairing code (for phone-based linking)
router.post('/whatsapp/pair', authMiddleware, async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const result = await whatsappService.requestPairingCode(phoneNumber);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// WhatsApp status check
router.get('/whatsapp/status', authMiddleware, (req, res) => {
    return res.json(whatsappService.getStatus());
});

// Telegram status check
router.get('/telegram/status', authMiddleware, (req, res) => {
    return res.json({
        status: telegramService.isMock() ? 'DISCONNECTED' : 'CONNECTED',
        isMock: telegramService.isMock()
    });
});

// WhatsApp sync available group chats
router.get('/whatsapp/groups', authMiddleware, async (req, res) => {
    try {
        const groups = await whatsappService.getChats();
        return res.json(groups);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Restart WhatsApp engine
router.post('/whatsapp/restart', authMiddleware, async (req, res) => {
    try {
        await whatsappService.restartWhatsApp();
        return res.json({ message: 'WhatsApp engine restart initiated' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Clear WhatsApp session and restart
router.post('/whatsapp/clear-session', authMiddleware, async (req, res) => {
    try {
        await whatsappService.clearSession();
        return res.json({ message: 'WhatsApp session cleared and engine restarted' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Update platform details
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { platform_name, platform_type, chat_id, description } = req.body;
        if (!platform_name || !platform_type || !chat_id) {
            return res.status(400).json({ error: 'platform_name, platform_type, and chat_id are required' });
        }
        
        const result = await db.query(
            'UPDATE platforms SET platform_name = $1, platform_type = $2, chat_id = $3, description = $4, updated_at = NOW() \
             WHERE id = $5 RETURNING *',
            [platform_name, platform_type, chat_id, description || '', req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Platform not found' });
        }
        return res.json(result.rows[0]);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

module.exports = router;
