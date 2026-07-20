const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const { compressImage, compressPptx, compressPdf } = require('./file/compression');
const {
    supabase, uploadsDir, bucketName, getExpiryDate, getMimetype,
    uploadToStorage, deleteFromStorage, getDownloadUrl,
    ensureFolderInStorage, deleteFolderFromStorage
} = require('./file/storage');

async function listFolders(userId) {
    let isAdmin = false;
    if (userId) {
        const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = userResult.rows[0]?.role;
        if (userRole === 'admin') isAdmin = true;
    }
    const result = await db.query(
        'SELECT fo.*, c.course_name, c.course_id as course_code FROM folders fo LEFT JOIN courses c ON fo.course_id = c.id'
    );
    let filteredFolders = result.rows;
    if (userId && !isAdmin) {
        const { getCourses } = require('./course.service');
        const courses = await getCourses(userId);
        const userCourseIds = courses.map(c => parseInt(c.id));
        filteredFolders = filteredFolders.filter(folder => {
            if (folder.course_id) return userCourseIds.includes(parseInt(folder.course_id));
            return parseInt(folder.created_by) === parseInt(userId);
        });
    }
    filteredFolders.sort((a, b) => a.name.localeCompare(b.name));
    return filteredFolders;
}

async function createFolder(name, courseId, userId) {
    const normalizedName = (name || '').trim().replace(/\s+/g, ' ');
    const result = await db.query(
        'INSERT INTO folders (name, course_id, created_by) VALUES ($1, $2, $3) RETURNING *',
        [normalizedName, courseId ? parseInt(courseId) : null, userId]
    );
    const folder = result.rows[0];
    await ensureFolderInStorage(normalizedName);
    return folder;
}

async function deleteFolder(folderId, deleteFiles = false) {
    const id = parseInt(folderId);
    let folderName = '';
    const folderRes = await db.query('SELECT name FROM folders WHERE id = $1', [id]);
    if (folderRes.rows.length > 0) folderName = folderRes.rows[0].name;

    const shouldDeleteFiles = String(deleteFiles) === 'true' || deleteFiles === true;
    if (shouldDeleteFiles) {
        const filesResult = await db.query('SELECT * FROM files WHERE folder_id = $1', [id]);
        for (const file of filesResult.rows) {
            await deleteFile(file.id);
        }
    } else {
        await db.query('UPDATE files SET folder_id = NULL WHERE folder_id = $1', [id]);
    }

    const result = await db.query('DELETE FROM folders WHERE id = $1', [id]);
    await deleteFolderFromStorage(folderName);
    return result.rowCount > 0;
}

async function uploadFile(file, userId, { overwrite = false, folderId = null } = {}) {
    let originalName = file.originalname;
    let fileType = file.mimetype;
    const fileTypeLower = fileType.toLowerCase();
    const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(fileTypeLower);
    if (isImage) {
        fileType = 'image/webp';
        const ext = path.extname(originalName);
        if (ext.toLowerCase() !== '.webp') {
            originalName = originalName.substring(0, originalName.length - ext.length) + '.webp';
        }
    }

    let fileSize = file.size;
    const expiresAt = getExpiryDate();
    const parsedFolderId = folderId ? parseInt(folderId) : null;

    let folderName = '';
    if (parsedFolderId) {
        const folderResult = await db.query('SELECT name FROM folders WHERE id = $1', [parsedFolderId]);
        if (folderResult.rows.length > 0) folderName = folderResult.rows[0].name;
    }
    const cleanFolderName = folderName ? folderName.replace(/[\/\\?%*:|"<>]/g, '_') : '';

    if (overwrite) {
        let query = 'SELECT * FROM files WHERE original_name = $1 AND is_deleted = false';
        const params = [originalName];
        if (parsedFolderId) {
            query += ' AND folder_id = $2';
            params.push(parsedFolderId);
        } else {
            query += ' AND folder_id IS NULL';
        }
        const existing = await db.query(query, params);
        for (const oldFile of existing.rows) {
            await deleteFile(oldFile.id);
        }
    }

    const extLower = path.extname(originalName).toLowerCase();

    if (isImage) {
        try {
            fileSize = await compressImage(file, originalName);
        } catch (err) {
            logger.error({ err }, '[Image Compression] Failed to compress image');
        }
    }

    if (extLower === '.pptx') {
        try {
            fileSize = await compressPptx(file, originalName);
        } catch (err) {
            logger.error({ err }, '[PPTX Compression] Failed to compress PPTX file');
        }
    }

    if (extLower === '.pdf') {
        try {
            fileSize = await compressPdf(file, originalName);
        } catch (err) {
            logger.error({ err }, '[PDF Compression] Failed to compress PDF file');
        }
    }

    const storagePath = cleanFolderName
        ? `${cleanFolderName}/${originalName}`
        : originalName;

    let savedStoragePath;
    try {
        savedStoragePath = await uploadToStorage(file.path, storagePath, fileType);
    } catch (err) {
        logger.error({ err }, 'Storage upload error');
        throw err;
    }

    try {
        fs.unlinkSync(file.path);
    } catch (_) {}

    const result = await db.query(
        'INSERT INTO files (original_name, storage_path, file_type, file_size, uploaded_by, expires_at, folder_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [originalName, savedStoragePath, fileType, fileSize, userId, expiresAt, parsedFolderId]
    );
    return result.rows[0];
}

async function checkDuplicate(filename, folderId = null) {
    const parsedFolderId = folderId ? parseInt(folderId) : null;
    let query = 'SELECT id, original_name, file_type, file_size, uploaded_at, uploaded_by FROM files WHERE original_name = $1 AND is_deleted = false';
    const params = [filename];
    if (parsedFolderId) {
        query += ' AND folder_id = $2';
        params.push(parsedFolderId);
    } else {
        query += ' AND folder_id IS NULL';
    }
    const result = await db.query(query, params);
    return result.rows[0] || null;
}

async function listFiles({ page = 1, limit = 50, search, userId, folderId } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['f.is_deleted = false'];
    const params = [];
    let paramIndex = 1;

    let isAdmin = false;
    if (userId) {
        const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userResult.rows[0]?.role === 'admin') isAdmin = true;
    }

    if (userId && !isAdmin) {
        conditions.push(`f.uploaded_by = $${paramIndex++}`);
        params.push(userId);
    }
    if (folderId) {
        conditions.push(`f.folder_id = $${paramIndex++}`);
        params.push(parseInt(folderId));
    } else if (!search) {
        conditions.push('f.folder_id IS NULL');
    }
    if (search) {
        conditions.push(`f.original_name ILIKE $${paramIndex++}`);
        params.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM files f ${where}`, params);
    const total = parseInt(countResult.rows[0]?.count || 0);

    const result = await db.query(
        `SELECT f.*, u.display_name as uploaded_by_name, u.username as uploaded_by_username
         FROM files f LEFT JOIN users u ON f.uploaded_by = u.id
         ${where}
         ORDER BY f.uploaded_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );

    return {
        files: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
}

async function getFileUrl(fileId, hostUrl = '') {
    const result = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [fileId]);
    if (result.rows.length === 0) throw new Error('File not found or has expired');
    const file = result.rows[0];
    const url = await getDownloadUrl(file.storage_path, hostUrl);
    return { url, file };
}

async function deleteFile(fileId) {
    const result = await db.query('SELECT * FROM files WHERE id = $1', [fileId]);
    if (result.rows.length === 0) return false;
    const file = result.rows[0];
    await db.query('UPDATE announcements SET file_id = NULL WHERE file_id = $1', [fileId]);
    await db.query("UPDATE announcements SET file_ids = array_remove(file_ids, $1) WHERE $1 = ANY(file_ids)", [fileId]);
    await deleteFromStorage(file.storage_path);
    await db.query('DELETE FROM files WHERE id = $1', [fileId]);
    return true;
}

async function cleanupExpiredFiles() {
    logger.info('Starting expired files cleanup job...');
    const result = await db.query(
        "SELECT * FROM files WHERE expires_at <= NOW() AND is_deleted = false"
    );
    const expired = result.rows;
    logger.info({ count: expired.length }, `Found expired files to delete`);
    let count = 0;
    for (const file of expired) {
        try {
            await deleteFile(file.id);
            count++;
        } catch (err) {
            logger.error({ err, fileId: file.id, fileName: file.original_name }, 'Error deleting expired file');
        }
    }
    logger.info({ deleted: count, found: expired.length }, 'File cleanup completed');
    return { found: expired.length, deleted: count };
}

async function getStorageUsage() {
    let usedBytes = 0;
    let limitBytes = parseInt(process.env.STORAGE_LIMIT_BYTES || '104857600', 10);
    const storageType = supabase ? 'Supabase Bucket' : 'Local Storage';

    if (supabase) {
        try {
            const result = await db.query(
                "SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) as used_bytes FROM storage.objects WHERE bucket_id = $1",
                [bucketName]
            );
            usedBytes = parseInt(result.rows[0].used_bytes, 10);
        } catch (err) {
            logger.error({ err }, 'Failed to get Supabase bucket size, falling back to files table');
            const result = await db.query('SELECT COALESCE(SUM(file_size), 0) as used_bytes FROM files WHERE is_deleted = false');
            usedBytes = parseInt(result.rows[0].used_bytes, 10);
        }
        limitBytes = parseInt(process.env.SUPABASE_STORAGE_LIMIT_BYTES || '1073741824', 10);
    } else {
        const result = await db.query('SELECT COALESCE(SUM(file_size), 0) as used_bytes FROM files WHERE is_deleted = false');
        usedBytes = parseInt(result.rows[0].used_bytes, 10);
    }

    const breakdown = { images: 0, documents: 0, archives: 0, others: 0 };
    let breakdownRows = [];

    if (supabase) {
        try {
            const result = await db.query(
                "SELECT metadata->>'mimetype' as file_type, (metadata->>'size')::bigint as file_size, name as original_name FROM storage.objects WHERE bucket_id = $1",
                [bucketName]
            );
            breakdownRows = result.rows;
        } catch (err) {
            logger.error({ err }, 'Failed to get Supabase breakdown, falling back to files table');
            const result = await db.query("SELECT file_type, file_size FROM files WHERE is_deleted = false");
            breakdownRows = result.rows;
        }
    } else {
        const result = await db.query("SELECT file_type, file_size FROM files WHERE is_deleted = false");
        breakdownRows = result.rows;
    }

    for (const row of breakdownRows) {
        const size = parseInt(row.file_size || 0, 10);
        const mime = (row.file_type || '').toLowerCase();
        const name = (row.original_name || '').toLowerCase();

        const isImage = mime.startsWith('image/') ||
            ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => name.endsWith(ext));
        const isDoc = mime.includes('pdf') || mime.includes('word') || mime.includes('excel') ||
            mime.includes('powerpoint') || mime.includes('presentation') || mime.includes('sheet') ||
            mime.includes('text/') || mime.includes('csv') || mime.includes('msword') ||
            mime.includes('officedocument') || mime.includes('epub') ||
            ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'].some(ext => name.endsWith(ext));
        const isArc = mime.includes('zip') || mime.includes('rar') || mime.includes('tar') ||
            mime.includes('compressed') || mime.includes('7z') ||
            ['.zip', '.rar', '.tar', '.gz', '.7z'].some(ext => name.endsWith(ext));

        if (isImage) breakdown.images += size;
        else if (isDoc) breakdown.documents += size;
        else if (isArc) breakdown.archives += size;
        else breakdown.others += size;
    }

    const percentage = limitBytes > 0 ? parseFloat(((usedBytes / limitBytes) * 100).toFixed(2)) : 0;
    return { usedBytes, limitBytes, percentage, storageType, breakdown };
}

async function moveFiles(fileIds, targetFolderId) {
    const parsedFolderId = targetFolderId ? parseInt(targetFolderId) : null;
    await db.query(
        'UPDATE files SET folder_id = $1 WHERE id = ANY($2::int[])',
        [parsedFolderId, fileIds]
    );
    return true;
}

async function updateFileExpiry(fileId, expiresAt, userId) {
    const checkResult = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [parseInt(fileId)]);
    if (checkResult.rows.length === 0) throw new Error('File not found');
    const file = checkResult.rows[0];
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;
    if (parseInt(file.uploaded_by) !== parseInt(userId) && userRole !== 'admin') {
        throw new Error('Unauthorized to modify this file');
    }
    const value = expiresAt ? new Date(expiresAt).toISOString() : null;
    const result = await db.query(
        'UPDATE files SET expires_at = $1 WHERE id = $2 RETURNING *',
        [value, parseInt(fileId)]
    );
    return result.rows[0];
}

async function extractZip(fileId, userId, { deleteOriginal = false, targetFolderId = null } = {}) {
    const AdmZip = require('adm-zip');
    const { downloadFromStorage } = require('./file/storage');
    const result = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [fileId]);
    if (result.rows.length === 0) throw new Error('File not found');
    const file = result.rows[0];

    const tempDir = path.join(uploadsDir, 'temp_zip');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const localZipPath = path.join(tempDir, `extract_${Date.now()}_${file.original_name}`);
    const buffer = await downloadFromStorage(file.storage_path);
    fs.writeFileSync(localZipPath, buffer);

    try {
        const zip = new AdmZip(localZipPath);
        const zipEntries = zip.getEntries();
        const extractedFiles = [];
        const folderMap = {};

        let courseId = null;
        if (targetFolderId) {
            const folderRes = await db.query('SELECT course_id FROM folders WHERE id = $1', [targetFolderId]);
            if (folderRes.rows.length > 0) courseId = folderRes.rows[0].course_id;
        }

        for (const entry of zipEntries) {
            if (entry.isDirectory) {
                const parts = entry.entryName.split('/').filter(Boolean);
                let currentPath = '';
                for (const part of parts) {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    if (!folderMap[currentPath]) {
                        let existingFolderQuery = 'SELECT id FROM folders WHERE name = $1 AND created_by = $2';
                        const params = [part, userId];
                        if (courseId) {
                            existingFolderQuery += ' AND course_id = $3';
                            params.push(courseId);
                        } else {
                            existingFolderQuery += ' AND course_id IS NULL';
                        }
                        const existingFolder = await db.query(existingFolderQuery, params);
                        if (existingFolder.rows.length > 0) {
                            folderMap[currentPath] = existingFolder.rows[0].id;
                        } else {
                            const newFolder = await createFolder(part, courseId, userId);
                            folderMap[currentPath] = newFolder.id;
                        }
                    }
                }
            }
        }

        for (const entry of zipEntries) {
            if (!entry.isDirectory) {
                const entryName = entry.entryName;
                if (entryName.includes('__MACOSX') || path.basename(entryName).startsWith('.')) continue;

                const dirName = path.dirname(entryName);
                let folderIdToUse = targetFolderId;
                if (dirName !== '.' && folderMap[dirName]) folderIdToUse = folderMap[dirName];

                const fileBuffer = entry.getData();
                const original_name = path.basename(entryName);
                const tempFilePath = path.join(tempDir, `unzip_file_${Date.now()}_${original_name}`);
                fs.writeFileSync(tempFilePath, fileBuffer);

                const mockFile = {
                    originalname: original_name,
                    mimetype: getMimetype(original_name),
                    size: fileBuffer.length,
                    path: tempFilePath
                };
                const record = await uploadFile(mockFile, userId, { overwrite: true, folderId: folderIdToUse });
                extractedFiles.push(record);
            }
        }

        if (String(deleteOriginal) === 'true') await deleteFile(fileId);

        return { message: `Successfully extracted ${extractedFiles.length} file(s)`, files: extractedFiles };
    } finally {
        if (fs.existsSync(localZipPath)) {
            try { fs.unlinkSync(localZipPath); } catch (_) {}
        }
    }
}

async function compressFiles(fileIds, archiveName, targetFolderId, userId) {
    const AdmZip = require('adm-zip');
    const { downloadFromStorage } = require('./file/storage');
    const result = await db.query(
        'SELECT * FROM files WHERE id = ANY($1::int[]) AND is_deleted = false',
        [fileIds]
    );
    const matchedFiles = result.rows;
    if (matchedFiles.length === 0) throw new Error('No valid files selected for compression');

    let finalArchiveName = archiveName ? archiveName.trim() : 'archive.zip';
    if (!finalArchiveName.toLowerCase().endsWith('.zip')) finalArchiveName += '.zip';

    const tempDir = path.join(uploadsDir, 'temp_zip');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const zip = new AdmZip();
    for (const file of matchedFiles) {
        try {
            const buffer = await downloadFromStorage(file.storage_path);
            zip.addFile(file.original_name, buffer);
        } catch (err) {
            logger.error({ fileName: file.original_name, err: err.message }, 'Failed to download file for compression');
        }
    }

    const tempZipPath = path.join(tempDir, `compress_${Date.now()}_${finalArchiveName}`);
    zip.writeZip(tempZipPath);

    const stats = fs.statSync(tempZipPath);
    const mockFile = {
        originalname: finalArchiveName,
        mimetype: 'application/zip',
        size: stats.size,
        path: tempZipPath
    };
    const record = await uploadFile(mockFile, userId, { overwrite: true, folderId: targetFolderId });
    return record;
}

module.exports = {
    uploadFile, getFileUrl, deleteFile, cleanupExpiredFiles,
    getStorageUsage, checkDuplicate, listFiles, uploadsDir,
    listFolders, createFolder, deleteFolder, moveFiles,
    extractZip, compressFiles, updateFileExpiry
};
