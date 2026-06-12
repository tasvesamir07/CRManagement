const express = require('express');
const router = express.Router();
const fileService = require('../services/file.service');
const uploadMiddleware = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/upload', authMiddleware, uploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const overwrite = req.query.overwrite === 'true';
        const fileRecord = await fileService.uploadFile(req.file, req.user.id, { overwrite });
        return res.status(201).json(fileRecord);
    } catch (err) {
        console.error('File upload route error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

router.post('/check-duplicate', authMiddleware, async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'filename is required' });
        }
        const duplicate = await fileService.checkDuplicate(filename);
        return res.json({ duplicate: !!duplicate, file: duplicate });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page, limit, search, userId } = req.query;
        const result = await fileService.listFiles({
            page: parseInt(page) || 1,
            limit: Math.min(parseInt(limit) || 50, 200),
            search,
            userId: userId || req.user.id,
        });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/storage-usage', authMiddleware, async (req, res) => {
    try {
        const usage = await fileService.getStorageUsage();
        return res.json(usage);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const hostUrl = `${req.protocol}://${req.get('host')}`;
        const data = await fileService.getFileUrl(req.params.id, hostUrl);
        return res.json(data);
    } catch (err) {
        return res.status(404).json({ error: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deleted = await fileService.deleteFile(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'File not found or already deleted' });
        }
        return res.json({ message: 'File deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
