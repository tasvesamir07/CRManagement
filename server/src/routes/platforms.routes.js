const express = require('express');
const router = express.Router();
const db = require('../config/database');
const whatsappService = require('../services/whatsapp.service');
const telegramService = require('../services/telegram.service');
const messengerService = require('../services/messenger.service');
const authMiddleware = require('../middleware/auth.middleware');
const cache = require('../config/cache');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');
const logger = require('../config/logger');

/**
 * @openapi
 * /platforms:
 *   get:
 *     tags: [Platforms]
 *     summary: List all registered platforms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *     responses:
 *       200:
 *         description: Array of platforms
 */
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

/**
 * @openapi
 * /platforms:
 *   post:
 *     tags: [Platforms]
 *     summary: Register a new platform
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform_name:
 *                 type: string
 *               platform_type:
 *                 type: string
 *               chat_id:
 *                 type: string
 *               description:
 *                 type: string
 *               course_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Platform created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, validate(schemas.platforms.create), async (req, res) => {
    try {
        const { platform_name, platform_type, chat_id, description, course_id } = req.body;
        
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

/**
 * @openapi
 * /platforms/{id}:
 *   delete:
 *     tags: [Platforms]
 *     summary: Delete a platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Platform ID
 *     responses:
 *       200:
 *         description: Platform deleted successfully
 *       404:
 *         description: Platform not found
 */
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

/**
 * @openapi
 * /platforms/whatsapp/pair:
 *   post:
 *     tags: [Platforms]
 *     summary: Request WhatsApp pairing code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pairing code result
 *       400:
 *         description: Phone number required
 */
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

/**
 * @openapi
 * /platforms/whatsapp/status:
 *   get:
 *     tags: [Platforms]
 *     summary: Check WhatsApp connection status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WhatsApp status object
 */
router.get('/whatsapp/status', authMiddleware, (req, res) => {
    return res.json(whatsappService.getStatus());
});

/**
 * @openapi
 * /platforms/telegram/status:
 *   get:
 *     tags: [Platforms]
 *     summary: Check Telegram connection status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Telegram status object
 */
router.get('/telegram/status', authMiddleware, (req, res) => {
    return res.json({
        status: telegramService.isMock() ? 'DISCONNECTED' : 'CONNECTED',
        isMock: telegramService.isMock()
    });
});

/**
 * @openapi
 * /platforms/messenger/status:
 *   get:
 *     tags: [Platforms]
 *     summary: Check Messenger connection status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Messenger status object
 */
router.get('/messenger/status', authMiddleware, (req, res) => {
    return res.json({
        status: messengerService.isMock() ? 'DISCONNECTED' : 'CONNECTED',
        isMock: messengerService.isMock()
    });
});

/**
 * @openapi
 * /platforms/whatsapp/groups:
 *   get:
 *     tags: [Platforms]
 *     summary: Sync available WhatsApp group chats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of WhatsApp groups
 */
router.get('/whatsapp/groups', authMiddleware, async (req, res) => {
    try {
        const groups = await whatsappService.getChats();
        return res.json(groups);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /platforms/whatsapp/restart:
 *   post:
 *     tags: [Platforms]
 *     summary: Restart WhatsApp engine
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WhatsApp engine restart initiated
 */
router.post('/whatsapp/restart', authMiddleware, async (req, res) => {
    try {
        await whatsappService.restartWhatsApp();
        return res.json({ message: 'WhatsApp engine restart initiated' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /platforms/whatsapp/clear-session:
 *   post:
 *     tags: [Platforms]
 *     summary: Clear WhatsApp session and restart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session cleared and engine restarted
 */
router.post('/whatsapp/clear-session', authMiddleware, async (req, res) => {
    try {
        await whatsappService.clearSession();
        return res.json({ message: 'WhatsApp session cleared and engine restarted' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /platforms/{id}:
 *   put:
 *     tags: [Platforms]
 *     summary: Update platform details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Platform ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform_name:
 *                 type: string
 *               platform_type:
 *                 type: string
 *               chat_id:
 *                 type: string
 *               description:
 *                 type: string
 *               course_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Platform updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Platform not found
 */
router.put('/:id', authMiddleware, validateParams(schemas.params.id), validate(schemas.platforms.update), async (req, res) => {
    try {
        const { platform_name, platform_type, chat_id, description, course_id } = req.body;
        
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

/**
 * @openapi
 * /platforms/messenger/appstate:
 *   post:
 *     tags: [Platforms]
 *     summary: Update Messenger AppState JSON
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appstate:
 *                 type: string
 *                 description: AppState JSON string or object
 *     responses:
 *       200:
 *         description: AppState updated and verified
 *       400:
 *         description: Invalid AppState
 */
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
        logger.info('Verifying newly uploaded Messenger AppState...');
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
