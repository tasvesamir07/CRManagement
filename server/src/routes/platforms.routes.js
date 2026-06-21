const express = require('express');
const router = express.Router();
const db = require('../config/database');
const whatsappService = require('../services/whatsapp.service');
const telegramService = require('../services/telegram.service');
const messengerService = require('../services/messenger.service');
const authMiddleware = require('../middleware/auth.middleware');
const cache = require('../config/cache');

// Fetch registered platforms
router.get('/', authMiddleware, async (req, res) => {
    try {
        const cacheKey = `platforms:${req.user.id}:${req.query.course_id || 'all'}:${req.user.role}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        let query = 'SELECT * FROM platforms WHERE is_active = true';
        const params = [];
        if (req.user.role !== 'admin') {
            query += ' AND created_by = $1';
            params.push(req.user.id);
        }
        // Optional filter by course_id
        if (req.query.course_id) {
            query += ` AND course_id = $${params.length + 1}`;
            params.push(req.query.course_id);
        }
        query += ' ORDER BY platform_name ASC';
        const result = await db.query(query, params);
        const platforms = result.rows.map(p => ({
            ...p,
            service_available: p.platform_type === 'telegram'
                ? !telegramService.isMock()
                : p.platform_type === 'whatsapp'
                ? !whatsappService.getStatus().isMock
                : !messengerService.isMock()
        }));
        
        cache.set(cacheKey, platforms, 60); // 60s TTL
        return res.json(platforms);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Register new platform
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { platform_name, platform_type, chat_id, description, course_id } = req.body;
        if (!platform_name || !platform_type || !chat_id) {
            return res.status(400).json({ error: 'platform_name, platform_type, and chat_id are required' });
        }
        
        const result = await db.query(
            'INSERT INTO platforms (platform_name, platform_type, chat_id, description, created_by, course_id) \
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [platform_name, platform_type, chat_id, description || '', req.user.id, course_id || null]
        );
        cache.invalidatePattern('platforms:');
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Delete platform (hard delete)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const platformId = req.params.id;
        // Delete referenced rows in announcement_platforms first
        await db.query('DELETE FROM announcement_platforms WHERE platform_id = $1', [platformId]);
        
        // Delete the platform itself
        const result = await db.query(
            'DELETE FROM platforms WHERE id = $1 RETURNING *',
            [platformId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Platform not found' });
        }
        cache.invalidatePattern('platforms:');
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

// Messenger status check
router.get('/messenger/status', authMiddleware, (req, res) => {
    return res.json({
        status: messengerService.isMock() ? 'DISCONNECTED' : 'CONNECTED',
        isMock: messengerService.isMock()
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
        const { platform_name, platform_type, chat_id, description, course_id } = req.body;
        if (!platform_name || !platform_type || !chat_id) {
            return res.status(400).json({ error: 'platform_name, platform_type, and chat_id are required' });
        }
        
        const result = await db.query(
            'UPDATE platforms SET platform_name = $1, platform_type = $2, chat_id = $3, description = $4, course_id = $5, updated_at = NOW() \
             WHERE id = $6 RETURNING *',
            [platform_name, platform_type, chat_id, description || '', course_id || null, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Platform not found' });
        }
        cache.invalidatePattern('platforms:');
        return res.json(result.rows[0]);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Update Messenger AppState JSON
router.post('/messenger/appstate', authMiddleware, async (req, res) => {
    try {
        const { appstate } = req.body;
        if (!appstate) {
            return res.status(400).json({ error: 'AppState JSON string is required' });
        }
        
        let parsed;
        try {
            parsed = typeof appstate === 'object' ? appstate : JSON.parse(appstate);
        } catch (jsonErr) {
            return res.status(400).json({ error: 'Invalid JSON format for AppState. Please make sure you copied the correct JSON structure.' });
        }

        // Save appState (persists to DB and writes backup file)
        await messengerService.saveAppState(parsed);
        
        // Reset bot client to trigger login with new credentials
        messengerService.resetBot();
        
        // Verify connection immediately
        console.log("Verifying newly uploaded Messenger AppState...");
        const isConnected = await messengerService.checkConnection();
        
        if (isConnected) {
            return res.json({ message: 'Messenger AppState updated and verified successfully!' });
        } else {
            return res.status(400).json({ error: 'Connection failed with the uploaded AppState. Please make sure your Facebook account is not locked and the AppState is valid.' });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
