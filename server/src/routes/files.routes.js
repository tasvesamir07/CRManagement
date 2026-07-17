const express = require('express');
const router = express.Router();
const fileService = require('../services/file.service');
const uploadMiddleware = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, validateParams, schemas } = require('../middleware/validate.middleware');

/**
 * @openapi
 * /files/upload:
 *   post:
 *     tags: [Files]
 *     summary: Upload a file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               overwrite:
 *                 type: boolean
 *               folderId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: File uploaded
 *       400:
 *         description: No file uploaded
 */
router.post('/upload', authMiddleware, uploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const overwrite = req.query.overwrite === 'true';
        const folderId = req.body.folderId || req.query.folderId || req.body.folder_id || req.query.folder_id;
        const fileRecord = await fileService.uploadFile(req.file, req.user.id, { overwrite, folderId });
        return res.status(201).json(fileRecord);
    } catch (err) {
        console.error('File upload route error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/check-duplicate:
 *   post:
 *     tags: [Files]
 *     summary: Check if a file with the same name exists
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *               folderId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Duplicate check result
 */
router.post('/check-duplicate', authMiddleware, validate(schemas.files.checkDuplicate), async (req, res) => {
    try {
        const { filename, folderId } = req.body;
        const duplicate = await fileService.checkDuplicate(filename, folderId);
        return res.json({ duplicate: !!duplicate, file: duplicate });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files:
 *   get:
 *     tags: [Files]
 *     summary: List files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: integer
 *         description: Filter by folder ID
 *     responses:
 *       200:
 *         description: Paginated list of files
 */
router.get('/', authMiddleware, validateQuery(schemas.files.listQuery), async (req, res) => {
    try {
        const { page, limit, search, userId, folderId } = req.query;
        const result = await fileService.listFiles({
            page: parseInt(page) || 1,
            limit: Math.min(parseInt(limit) || 50, 200),
            search,
            userId: userId || req.user.id,
            folderId
        });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/folders:
 *   post:
 *     tags: [Files]
 *     summary: Create a folder
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
 *               courseId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Folder created
 */
router.post('/folders', authMiddleware, validate(schemas.files.createFolder), async (req, res) => {
    try {
        const { name, courseId } = req.body;
        const folder = await fileService.createFolder(name, courseId, req.user.id);
        return res.status(201).json(folder);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/folders/{id}:
 *   delete:
 *     tags: [Files]
 *     summary: Delete a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Folder ID
 *       - in: query
 *         name: deleteFiles
 *         schema:
 *           type: boolean
 *         description: Also delete contained files
 *     responses:
 *       200:
 *         description: Folder deleted successfully
 *       404:
 *         description: Folder not found
 */
router.delete('/folders/:id', authMiddleware, validateParams(schemas.params.folderId), async (req, res) => {
    try {
        const { deleteFiles } = req.query;
        const deleted = await fileService.deleteFolder(req.params.id, deleteFiles);
        if (!deleted) {
            return res.status(404).json({ error: 'Folder not found or already deleted' });
        }
        return res.json({ message: 'Folder deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/storage-usage:
 *   get:
 *     tags: [Files]
 *     summary: Get storage usage statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage usage data
 */
router.get('/storage-usage', authMiddleware, async (req, res) => {
    try {
        const usage = await fileService.getStorageUsage();
        return res.json(usage);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/{id}:
 *   get:
 *     tags: [Files]
 *     summary: Get file download URL
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       200:
 *         description: File URL data
 *       404:
 *         description: File not found
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const hostUrl = `${req.protocol}://${req.get('host')}`;
        const data = await fileService.getFileUrl(req.params.id, hostUrl);
        return res.json(data);
    } catch (err) {
        return res.status(404).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/{id}:
 *   delete:
 *     tags: [Files]
 *     summary: Delete a file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 */
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

/**
 * @openapi
 * /files/compress:
 *   post:
 *     tags: [Files]
 *     summary: Compress files into a ZIP archive
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               archiveName:
 *                 type: string
 *               folderId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Compressed archive record
 *       400:
 *         description: ids array required
 */
router.post('/compress', authMiddleware, async (req, res) => {
    try {
        const { ids, archiveName, folderId } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        const record = await fileService.compressFiles(ids, archiveName, folderId, req.user.id);
        return res.json(record);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/extract/{id}:
 *   post:
 *     tags: [Files]
 *     summary: Extract a ZIP archive
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Archive file ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteOriginal:
 *                 type: boolean
 *               targetFolderId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Extraction result
 */
router.post('/extract/:id', authMiddleware, async (req, res) => {
    try {
        const { deleteOriginal, targetFolderId } = req.body;
        const result = await fileService.extractZip(req.params.id, req.user.id, {
            deleteOriginal,
            targetFolderId
        });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/move:
 *   post:
 *     tags: [Files]
 *     summary: Move files to a folder
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               folderId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Files moved successfully
 *       400:
 *         description: ids array required
 */
router.post('/move', authMiddleware, async (req, res) => {
    try {
        const { ids, folderId } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        await fileService.moveFiles(ids, folderId);
        return res.json({ message: 'Files moved successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /files/{id}/expiry:
 *   patch:
 *     tags: [Files]
 *     summary: Update file expiry date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: File updated
 *       403:
 *         description: Unauthorized
 */
router.patch('/:id/expiry', authMiddleware, async (req, res) => {
    try {
        const { expiresAt } = req.body;
        const file = await fileService.updateFileExpiry(req.params.id, expiresAt, req.user.id);
        return res.json(file);
    } catch (err) {
        return res.status(err.message === 'Unauthorized to modify this file' ? 403 : 500).json({ error: err.message });
    }
});

module.exports = router;

