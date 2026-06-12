const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase if credentials are provided
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'announcement-files';

if (supabaseUrl && supabaseKey) {
    console.log('Supabase Storage configurations detected. Initializing Supabase client...');
    const cleanSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    supabase = createClient(cleanSupabaseUrl, supabaseKey);
} else {
    console.log('⚠️ Supabase credentials missing. File service will run on local uploads fallback.');
}

const isVercel = !!process.env.VERCEL;
const uploadsDir = isVercel
    ? '/tmp/uploads'
    : path.join(__dirname, '../../../uploads');

if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create uploads directory:', err.message);
    }
}

// Helper to calculate expiry date (15 days from now)
function getExpiryDate() {
    const days = parseInt(process.env.FILE_EXPIRY_DAYS || '15');
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

// Ensure course folders are synced/seeded for the user's active courses
async function ensureCourseFolders(userId) {
    if (!userId) return;
    try {
        const { getCourses } = require('./course.service');
        const courses = await getCourses(userId);
        
        // Get existing folders with courses
        const existingFoldersResult = await db.query('SELECT * FROM folders WHERE course_id IS NOT NULL');
        const existingCourseIds = existingFoldersResult.rows.map(f => parseInt(f.course_id));
        
        for (const course of courses) {
            if (!existingCourseIds.includes(parseInt(course.id))) {
                const folderName = `${course.course_id} - ${course.course_name}`;
                await db.query(
                    'INSERT INTO folders (name, course_id, created_by) VALUES ($1, $2, $3)',
                    [folderName, course.id, userId]
                );
            }
        }
    } catch (err) {
        console.error('Failed to seed course folders:', err.message);
    }
}

async function listFolders(userId) {
    if (userId) {
        await ensureCourseFolders(userId);
    }
    
    const result = await db.query(
        'SELECT fo.*, c.course_name, c.course_id as course_code FROM folders fo LEFT JOIN courses c ON fo.course_id = c.id'
    );
    
    let filteredFolders = result.rows;
    if (userId) {
        const { getCourses } = require('./course.service');
        const courses = await getCourses(userId);
        const userCourseIds = courses.map(c => parseInt(c.id));
        
        filteredFolders = filteredFolders.filter(folder => {
            if (folder.course_id) {
                return userCourseIds.includes(parseInt(folder.course_id));
            }
            return parseInt(folder.created_by) === parseInt(userId);
        });
    }
    
    filteredFolders.sort((a, b) => a.name.localeCompare(b.name));
    return filteredFolders;
}

async function createFolder(name, courseId, userId) {
    const result = await db.query(
        'INSERT INTO folders (name, course_id, created_by) VALUES ($1, $2, $3) RETURNING *',
        [name, courseId ? parseInt(courseId) : null, userId]
    );
    return result.rows[0];
}

async function deleteFolder(folderId, deleteFiles) {
    const id = parseInt(folderId);
    const shouldDeleteFiles = String(deleteFiles) === 'true';
    
    if (shouldDeleteFiles) {
        // Fetch and delete all files in the folder
        const filesResult = await db.query(
            'SELECT * FROM files WHERE folder_id = $1 AND is_deleted = false',
            [id]
        );
        for (const file of filesResult.rows) {
            await deleteFile(file.id);
        }
    }
    
    // Now delete the folder record
    // ON DELETE SET NULL constraint will automatically set any remaining files' folder_id to NULL
    const result = await db.query(
        'DELETE FROM folders WHERE id = $1',
        [id]
    );
    return result.rowCount > 0;
}

async function uploadFile(file, userId, { overwrite = false, folderId = null } = {}) {
    const originalName = file.originalname;
    const fileType = file.mimetype;
    let fileSize = file.size;
    const expiresAt = getExpiryDate();
    const parsedFolderId = folderId ? parseInt(folderId) : null;

    // Get folder name for storage path organization
    let folderName = '';
    if (parsedFolderId) {
        const folderResult = await db.query('SELECT name FROM folders WHERE id = $1', [parsedFolderId]);
        if (folderResult.rows.length > 0) {
            folderName = folderResult.rows[0].name;
        }
    }
    const cleanFolderName = folderName ? folderName.replace(/[\/\\?%*:|"<>]/g, '_') : '';

    // If overwriting, find and delete existing file with same name in same folder
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

    // Image Compression logic
    const fileTypeLower = fileType.toLowerCase();
    const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(fileTypeLower);
    
    if (isImage) {
        try {
            const sharp = require('sharp');
            const imageQuality = parseInt(process.env.IMAGE_QUALITY || '80');
            const pngCompression = parseInt(process.env.PNG_COMPRESSION_LEVEL || '9');
            
            let pipeline = sharp(file.path).rotate();
            
            if (fileTypeLower === 'image/jpeg' || fileTypeLower === 'image/jpg') {
                pipeline = pipeline.jpeg({ quality: imageQuality });
            } else if (fileTypeLower === 'image/png') {
                pipeline = pipeline.png({ compressionLevel: pngCompression, palette: true });
            } else if (fileTypeLower === 'image/webp') {
                pipeline = pipeline.webp({ quality: imageQuality });
            }
            
            const compressedBuffer = await pipeline.toBuffer();
            fs.writeFileSync(file.path, compressedBuffer);
            fileSize = compressedBuffer.length;
            console.log(`[Image Compression] Compressed image "${originalName}" from ${file.size} to ${fileSize} bytes.`);
        } catch (compressErr) {
            console.error('[Image Compression] Failed to compress image:', compressErr.message);
        }
    }
    
    let storagePath = '';
    
    if (supabase) {
        const uniqueName = originalName;
        const uploadKey = cleanFolderName ? `${cleanFolderName}/${uniqueName}` : uniqueName;
        const fileBuffer = fs.readFileSync(file.path);
        
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(uploadKey, fileBuffer, {
                contentType: fileType,
                duplex: 'half',
                upsert: true
            });
            
        if (error) {
            console.error('Supabase upload error:', error.message);
            throw new Error(`Supabase upload failed: ${error.message}`);
        }
        
        storagePath = data?.path || uploadKey;
        
        try {
            fs.unlinkSync(file.path);
        } catch (err) {
            console.error('Failed to delete temp multer file:', err);
        }
    } else {
        const uniqueName = originalName;
        let finalPath;
        if (cleanFolderName) {
            const folderDirPath = path.join(uploadsDir, cleanFolderName);
            if (!fs.existsSync(folderDirPath)) {
                fs.mkdirSync(folderDirPath, { recursive: true });
            }
            finalPath = path.join(folderDirPath, uniqueName);
            storagePath = `${cleanFolderName}/${uniqueName}`;
        } else {
            finalPath = path.join(uploadsDir, uniqueName);
            storagePath = uniqueName;
        }
        
        if (fs.existsSync(finalPath)) {
            try {
                fs.unlinkSync(finalPath);
            } catch (err) {
                console.error('Failed to remove old file for overwrite:', err.message);
            }
        }
        fs.renameSync(file.path, finalPath);
    }

    const result = await db.query(
        'INSERT INTO files (original_name, storage_path, file_type, file_size, uploaded_by, expires_at, folder_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [originalName, storagePath, fileType, fileSize, userId, expiresAt, parsedFolderId]
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

    if (userId) {
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

    const countResult = await db.query(
        `SELECT COUNT(*) FROM files f ${where}`, params
    );
    const total = parseInt(countResult.rows[0]?.count || 0);

    const result = await db.query(
        `SELECT f.*, u.display_name as uploaded_by_name, u.username as uploaded_by_username
         FROM files f
         LEFT JOIN users u ON f.uploaded_by = u.id
         ${where}
         ORDER BY f.uploaded_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );

    return {
        files: result.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

async function getFileUrl(fileId, hostUrl = '') {
    const result = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [fileId]);
    if (result.rows.length === 0) {
        throw new Error('File not found or has expired');
    }
    
    const file = result.rows[0];
    
    if (supabase) {
        // Generate signed URL (expires in 1 hour)
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(file.storage_path, 3600);
            
        if (error) {
            console.error('Supabase signed URL error:', error.message);
            throw new Error(`Failed to generate download URL: ${error.message}`);
        }
        return {
            url: data.signedUrl,
            file
        };
    } else {
        // Local download URL
        const cleanHost = hostUrl.replace(/\/$/, '');
        return {
            url: `${cleanHost}/uploads/${file.storage_path}`,
            file
        };
    }
}

async function deleteFile(fileId) {
    const result = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [fileId]);
    if (result.rows.length === 0) {
        return false;
    }
    
    const file = result.rows[0];
    
    // Nullify references in announcements before deleting
    await db.query("UPDATE announcements SET file_id = NULL WHERE file_id = $1", [fileId]);
    await db.query("UPDATE announcements SET file_ids = array_remove(file_ids, $1) WHERE $1 = ANY(file_ids)", [fileId]);
    
    if (supabase) {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([file.storage_path]);
            
        if (error) {
            console.error('Failed to remove file from Supabase storage:', error.message);
        }
    } else {
        const filePath = path.join(uploadsDir, file.storage_path);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error('Failed to remove local file from disk:', err.message);
            }
        }
    }
    
    await db.query('UPDATE files SET is_deleted = true WHERE id = $1', [fileId]);
    return true;
}

// Daily Cron cleanup function
async function cleanupExpiredFiles() {
    console.log('⏰ Starting expired files cleanup job...');
    const result = await db.query(
        "SELECT * FROM files WHERE expires_at <= NOW() AND is_deleted = false"
    );
    const expired = result.rows;

    console.log(`Found ${expired.length} expired files to delete.`);

    let count = 0;
    for (const file of expired) {
        try {
            await deleteFile(file.id);
            count++;
        } catch (err) {
            console.error(`Error deleting file ID ${file.id} (${file.original_name}):`, err.message);
        }
    }

    console.log(`✅ Cleanup completed. Deleted ${count}/${expired.length} files.`);
    return { found: expired.length, deleted: count };
}

async function getStorageUsage() {
    let usedBytes = 0;
    let limitBytes = parseInt(process.env.STORAGE_LIMIT_BYTES || '104857600', 10); // default to 100MB
    const storageType = supabase ? 'Supabase Bucket' : 'Local Storage';
    
    if (supabase) {
        try {
            const result = await db.query(
                "SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) as used_bytes FROM storage.objects WHERE bucket_id = $1",
                [bucketName]
            );
            usedBytes = parseInt(result.rows[0].used_bytes, 10);
        } catch (err) {
            console.error('Failed to get Supabase bucket size from database, falling back to files table:', err.message);
            const result = await db.query('SELECT COALESCE(SUM(file_size), 0) as used_bytes FROM files WHERE is_deleted = false');
            usedBytes = parseInt(result.rows[0].used_bytes, 10);
        }
        limitBytes = parseInt(process.env.SUPABASE_STORAGE_LIMIT_BYTES || '1073741824', 10); // default to 1GB for Supabase
    } else {
        const result = await db.query('SELECT COALESCE(SUM(file_size), 0) as used_bytes FROM files WHERE is_deleted = false');
        usedBytes = parseInt(result.rows[0].used_bytes, 10);
    }
    
    const percentage = limitBytes > 0 ? parseFloat(((usedBytes / limitBytes) * 100).toFixed(2)) : 0;
    
    return {
        usedBytes,
        limitBytes,
        percentage,
        storageType
    };
}

async function moveFiles(fileIds, targetFolderId) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) return false;
    const parsedFolderId = targetFolderId ? parseInt(targetFolderId) : null;
    
    await db.query(
        'UPDATE files SET folder_id = $1 WHERE id = ANY($2::int[])',
        [parsedFolderId, fileIds]
    );
    return true;
}

module.exports = {
    uploadFile,
    getFileUrl,
    deleteFile,
    cleanupExpiredFiles,
    getStorageUsage,
    checkDuplicate,
    listFiles,
    uploadsDir,
    listFolders,
    createFolder,
    deleteFolder,
    moveFiles
};
