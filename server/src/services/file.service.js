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

async function uploadFile(file, userId, { overwrite = false } = {}) {
    const originalName = file.originalname;
    const fileType = file.mimetype;
    let fileSize = file.size;
    const expiresAt = getExpiryDate();

    // If overwriting, find and delete existing file with same name
    if (overwrite) {
        const existing = await db.query(
            'SELECT * FROM files WHERE original_name = $1 AND is_deleted = false',
            [originalName]
        );
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
        const uniqueName = `${Date.now()}-${originalName.replace(/\s+/g, '_')}`;
        const fileBuffer = fs.readFileSync(file.path);
        
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(uniqueName, fileBuffer, {
                contentType: fileType,
                duplex: 'half'
            });
            
        if (error) {
            console.error('Supabase upload error:', error.message);
            throw new Error(`Supabase upload failed: ${error.message}`);
        }
        
        storagePath = data.path;
        
        try {
            fs.unlinkSync(file.path);
        } catch (err) {
            console.error('Failed to delete temp multer file:', err);
        }
    } else {
        const uniqueName = `${Date.now()}-${originalName.replace(/\s+/g, '_')}`;
        const finalPath = path.join(uploadsDir, uniqueName);
        
        fs.renameSync(file.path, finalPath);
        storagePath = uniqueName;
    }

    const result = await db.query(
        'INSERT INTO files (original_name, storage_path, file_type, file_size, uploaded_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [originalName, storagePath, fileType, fileSize, userId, expiresAt]
    );

    return result.rows[0];
}

async function checkDuplicate(filename) {
    const result = await db.query(
        'SELECT id, original_name, file_type, file_size, created_at, uploaded_by FROM files WHERE original_name = $1 AND is_deleted = false',
        [filename]
    );
    return result.rows[0] || null;
}

async function listFiles({ page = 1, limit = 50, search, userId } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['f.is_deleted = false'];
    const params = [];
    let paramIndex = 1;

    if (userId) {
        conditions.push(`f.uploaded_by = $${paramIndex++}`);
        params.push(userId);
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
         ORDER BY f.created_at DESC
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
    
    // Mark as deleted in database
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

module.exports = {
    uploadFile,
    getFileUrl,
    deleteFile,
    cleanupExpiredFiles,
    getStorageUsage,
    checkDuplicate,
    listFiles,
    uploadsDir
};
