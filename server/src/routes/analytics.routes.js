const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const analyticsService = require('../services/analytics.service');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validate.middleware');

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many analytics events, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /analytics/stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get dashboard statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /analytics/track:
 *   post:
 *     tags: [Analytics]
 *     summary: Track an analytics event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_type:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event tracked
 */
router.post('/track', authMiddleware, trackLimiter, validate(schemas.analytics.track), async (req, res) => {
  try {
    const { event_type, metadata } = req.body;
    await analyticsService.track(event_type, req.user?.id, metadata);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
