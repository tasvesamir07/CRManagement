const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analytics.service');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/track', authMiddleware, async (req, res) => {
  try {
    const { event_type, metadata } = req.body;
    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }
    await analyticsService.track(event_type, req.user?.id, metadata);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
