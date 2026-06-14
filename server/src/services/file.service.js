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

async function listFolders(userId) {
    let isAdmin = false;
    if (userId) {
        const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = userResult.rows[0]?.role;
        if (userRole === 'admin') {
            isAdmin = true;
        }
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
    // Trim and normalize name
    const normalizedName = (name || '').trim().replace(/\s+/g, ' ');
    const result = await db.query(
        'INSERT INTO folders (name, course_id, created_by) VALUES ($1, $2, $3) RETURNING *',
        [normalizedName, courseId ? parseInt(courseId) : null, userId]
    );
    const folder = result.rows[0];

    const cleanFolderName = normalizedName ? normalizedName.replace(/[\/\\?%*:|"<>]/g, '_') : '';
    if (cleanFolderName) {
        if (supabase) {
            try {
                // Upload an empty folder placeholder to Supabase bucket
                const placeholderPath = `${cleanFolderName}/.emptyFolderPlaceholder`;
                await supabase.storage
                    .from(bucketName)
                    .upload(placeholderPath, Buffer.from(''), {
                        contentType: 'application/octet-stream',
                        upsert: true
                    });
            } catch (err) {
                console.error('Failed to create folder placeholder in Supabase:', err.message);
            }
        } else {
            try {
                const folderDirPath = path.join(uploadsDir, cleanFolderName);
                if (!fs.existsSync(folderDirPath)) {
                    fs.mkdirSync(folderDirPath, { recursive: true });
                }
            } catch (err) {
                console.error('Failed to create folder directory on disk:', err.message);
            }
        }
    }

    return folder;
}

async function deleteFolder(folderId, _deleteFiles) {
    const id = parseInt(folderId);
    
    // Fetch folder name to clean up bucket/disk folder
    let folderName = '';
    const folderRes = await db.query('SELECT name FROM folders WHERE id = $1', [id]);
    if (folderRes.rows.length > 0) {
        folderName = folderRes.rows[0].name;
    }
    const cleanFolderName = folderName ? folderName.replace(/[\/\\?%*:|"<>]/g, '_') : '';

    // Fetch and delete all files in the folder (from files table)
    const filesResult = await db.query(
        'SELECT * FROM files WHERE folder_id = $1',
        [id]
    );
    for (const file of filesResult.rows) {
        await deleteFile(file.id);
    }
    
    // Now delete the folder record
    const result = await db.query(
        'DELETE FROM folders WHERE id = $1',
        [id]
    );
    
    // Clean up Supabase folder contents and placeholder
    if (supabase && cleanFolderName) {
        try {
            // List all files in the folder from Supabase storage
            const { data: bucketFiles, error: listError } = await supabase.storage
                .from(bucketName)
                .list(cleanFolderName);
            
            if (!listError && bucketFiles && bucketFiles.length > 0) {
                const pathsToDelete = bucketFiles.map(f => `${cleanFolderName}/${f.name}`);
                await supabase.storage
                    .from(bucketName)
                    .remove(pathsToDelete);
            }
            
            // Also explicitly delete the placeholder and directory name itself
            await supabase.storage
                .from(bucketName)
                .remove([`${cleanFolderName}/.emptyFolderPlaceholder`]);
        } catch (err) {
            console.error('Failed to clean up Supabase folder contents:', err.message);
        }
    }

    // Clean up empty local directory if it exists on disk
    if (cleanFolderName && !supabase) {
        const folderDirPath = path.join(uploadsDir, cleanFolderName);
        if (fs.existsSync(folderDirPath)) {
            try {
                fs.rmSync(folderDirPath, { recursive: true, force: true });
            } catch (err) {
                console.error(`Failed to delete local folder directory: ${err.message}`);
            }
        }
    }

    return result.rowCount > 0;
}

async function uploadFile(file, userId, { overwrite = false, folderId = null } = {}) {
    let originalName = file.originalname;
    let fileType = file.mimetype;
    
    // Auto WebP conversion for images
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

    // File Compression Logic
    const extLower = path.extname(originalName).toLowerCase();

    // 1. Image Compression
    if (isImage) {
        try {
            const sharp = require('sharp');
            const imageQuality = parseInt(process.env.IMAGE_QUALITY || '80');
            
            const pipeline = sharp(file.path).rotate().webp({ quality: imageQuality });
            
            const compressedBuffer = await pipeline.toBuffer();
            fs.writeFileSync(file.path, compressedBuffer);
            fileSize = compressedBuffer.length;
            console.log(`[Image Compression] Converted & Compressed image "${originalName}" size: ${fileSize} bytes.`);
        } catch (compressErr) {
            console.error('[Image Compression] Failed to compress image:', compressErr.message);
        }
    }

    // 2. PPTX (PowerPoint) Compression (by compressing internal images in ppt/media/)
    if (extLower === '.pptx') {
        try {
            const AdmZip = require('adm-zip');
            const sharp = require('sharp');
            const zip = new AdmZip(file.path);
            const zipEntries = zip.getEntries();
            let compressedCount = 0;
            let originalBytes = 0;
            let compressedBytes = 0;

            for (const entry of zipEntries) {
                const isMedia = entry.entryName.startsWith('ppt/media/');
                if (!isMedia) continue;

                const mediaExt = path.extname(entry.entryName).toLowerCase();
                const isMediaImage = ['.jpg', '.jpeg', '.png'].includes(mediaExt);
                if (!isMediaImage) continue;

                const originalBuffer = entry.getData();
                originalBytes += originalBuffer.length;

                try {
                    let compressedBuffer;
                    if (mediaExt === '.png') {
                        // Compress PNG with palette and high compression level
                        compressedBuffer = await sharp(originalBuffer)
                            .png({ quality: 75, compressionLevel: 8, palette: true })
                            .toBuffer();
                    } else {
                        // Compress JPEG
                        compressedBuffer = await sharp(originalBuffer)
                            .jpeg({ quality: 70, progressive: true })
                            .toBuffer();
                    }

                    if (compressedBuffer.length < originalBuffer.length) {
                        entry.setData(compressedBuffer);
                        compressedBytes += compressedBuffer.length;
                        compressedCount++;
                    } else {
                        compressedBytes += originalBuffer.length;
                    }
                } catch (err) {
                    console.error(`[PPTX Compression] Failed to compress entry ${entry.entryName}:`, err.message);
                    compressedBytes += originalBuffer.length;
                }
            }

            if (compressedCount > 0) {
                zip.writeZip(file.path);
                const stats = fs.statSync(file.path);
                fileSize = stats.size;
                const savedPercentage = originalBytes > 0 ? ((originalBytes - compressedBytes) / originalBytes * 100).toFixed(1) : '0';
                console.log(`[PPTX Compression] Compressed ${compressedCount} images in "${originalName}". New size: ${fileSize} bytes. Saved ${savedPercentage}% of media bytes.`);
            }
        } catch (compressErr) {
            console.error('[PPTX Compression] Failed to compress PPTX file:', compressErr.message);
        }
    }

    // 3. PDF Compression (via Ghostscript if available on the system)
    if (extLower === '.pdf') {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            let gsInstalled = false;
            try {
                await execPromise('gs --version');
                gsInstalled = true;
            } catch (_) {}

            if (gsInstalled) {
                const tempOutputPath = file.path + '.compressed.pdf';
                // Optimize PDF images and streams (setting /ebook downsamples images to 150dpi and compresses text/vectors)
                const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${file.path}"`;
                
                await execPromise(gsCommand);

                if (fs.existsSync(tempOutputPath)) {
                    const originalStats = fs.statSync(file.path);
                    const compressedStats = fs.statSync(tempOutputPath);

                    if (compressedStats.size < originalStats.size) {
                        fs.unlinkSync(file.path);
                        fs.renameSync(tempOutputPath, file.path);
                        fileSize = compressedStats.size;
                        console.log(`[PDF Compression] Compressed PDF "${originalName}" from ${originalStats.size} to ${fileSize} bytes.`);
                    } else {
                        fs.unlinkSync(tempOutputPath);
                        console.log(`[PDF Compression] Compression did not reduce size for "${originalName}". Keeping original.`);
                    }
                }
            } else {
                console.log(`[PDF Compression] Ghostscript (gs) is not installed on this system. Skipping PDF compression.`);
            }
        } catch (compressErr) {
            console.error('[PDF Compression] Failed to compress PDF file:', compressErr.message);
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

    let isAdmin = false;
    if (userId) {
        const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = userResult.rows[0]?.role;
        if (userRole === 'admin') {
            isAdmin = true;
        }
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
    const result = await db.query('SELECT * FROM files WHERE id = $1', [fileId]);
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
    
    await db.query('DELETE FROM files WHERE id = $1', [fileId]);
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
    
    // Calculate category-wise breakdown
    let breakdown = {
        images: 0,
        documents: 0,
        archives: 0,
        others: 0
    };

    let breakdownRows = [];
    if (supabase) {
        try {
            const result = await db.query(
                "SELECT metadata->>'mimetype' as file_type, (metadata->>'size')::bigint as file_size, name as original_name FROM storage.objects WHERE bucket_id = $1",
                [bucketName]
            );
            breakdownRows = result.rows;
        } catch (err) {
            console.error('Failed to get Supabase breakdown from storage.objects, falling back to files table:', err.message);
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

        const isDoc = mime.includes('pdf') ||
                      mime.includes('word') ||
                      mime.includes('excel') ||
                      mime.includes('powerpoint') ||
                      mime.includes('presentation') ||
                      mime.includes('sheet') ||
                      mime.includes('text/') ||
                      mime.includes('csv') ||
                      mime.includes('msword') ||
                      mime.includes('officedocument') ||
                      mime.includes('epub') ||
                      ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'].some(ext => name.endsWith(ext));

        const isArc = mime.includes('zip') ||
                      mime.includes('rar') ||
                      mime.includes('tar') ||
                      mime.includes('compressed') ||
                      mime.includes('7z') ||
                      ['.zip', '.rar', '.tar', '.gz', '.7z'].some(ext => name.endsWith(ext));

        if (isImage) {
            breakdown.images += size;
        } else if (isDoc) {
            breakdown.documents += size;
        } else if (isArc) {
            breakdown.archives += size;
        } else {
            breakdown.others += size;
        }
    }
    
    const percentage = limitBytes > 0 ? parseFloat(((usedBytes / limitBytes) * 100).toFixed(2)) : 0;
    
    return {
        usedBytes,
        limitBytes,
        percentage,
        storageType,
        breakdown
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

async function updateFileExpiry(fileId, expiresAt, userId) {
    const checkResult = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [parseInt(fileId)]);
    if (checkResult.rows.length === 0) {
        throw new Error('File not found');
    }
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


function getMimetype(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.zip': 'application/zip',
        '.rar': 'application/vnd.rar',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4'
    };
    return mimes[ext] || 'application/octet-stream';
}

async function extractZip(fileId, userId, { deleteOriginal = false, targetFolderId = null } = {}) {
    const AdmZip = require('adm-zip');
    
    // 1. Get the ZIP file record from DB
    const result = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [fileId]);
    if (result.rows.length === 0) {
        throw new Error('File not found');
    }
    const file = result.rows[0];

    // 2. Download or locate zip file
    let localZipPath = '';
    const tempDir = path.join(uploadsDir, 'temp_zip');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    if (supabase) {
        // Download from Supabase
        const { data, error } = await supabase.storage
            .from(bucketName)
            .download(file.storage_path);
        
        if (error) {
            throw new Error(`Failed to download zip from Supabase: ${error.message}`);
        }
        
        localZipPath = path.join(tempDir, `extract_${Date.now()}_${file.original_name}`);
        const buffer = Buffer.from(await data.arrayBuffer());
        fs.writeFileSync(localZipPath, buffer);
    } else {
        localZipPath = path.join(uploadsDir, file.storage_path);
    }

    try {
        // 3. Open Zip
        const zip = new AdmZip(localZipPath);
        const zipEntries = zip.getEntries();

        const extractedFiles = [];
        const folderMap = {};

        // If we are starting from a target folder, get its course ID so new subfolders share the same course context
        let courseId = null;
        if (targetFolderId) {
            const folderRes = await db.query('SELECT course_id FROM folders WHERE id = $1', [targetFolderId]);
            if (folderRes.rows.length > 0) {
                courseId = folderRes.rows[0].course_id;
            }
        }

        // Loop 1: Create folders first to preserve hierarchy
        for (const entry of zipEntries) {
            if (entry.isDirectory) {
                const parts = entry.entryName.split('/').filter(Boolean);
                let currentPath = '';

                for (const part of parts) {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;

                    if (!folderMap[currentPath]) {
                        // Check if folder already exists for this user/course
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
                            // Create new virtual folder
                            const newFolder = await createFolder(part, courseId, userId);
                            folderMap[currentPath] = newFolder.id;
                        }
                    }
                }
            }
        }

        // Loop 2: Extract files and assign them to correct folders
        for (const entry of zipEntries) {
            if (!entry.isDirectory) {
                const entryName = entry.entryName;
                // Skip macOS resource fork files and dotfiles
                if (entryName.includes('__MACOSX') || path.basename(entryName).startsWith('.')) {
                    continue;
                }

                // Determine folder ID based on ZIP folder path
                const dirName = path.dirname(entryName);
                let folderIdToUse = targetFolderId;
                if (dirName !== '.' && folderMap[dirName]) {
                    folderIdToUse = folderMap[dirName];
                }

                const fileBuffer = entry.getData();
                const original_name = path.basename(entryName);
                
                // Write buffer to temp file on disk
                const tempFilePath = path.join(tempDir, `unzip_file_${Date.now()}_${original_name}`);
                fs.writeFileSync(tempFilePath, fileBuffer);

                const mockFile = {
                    originalname: original_name,
                    mimetype: getMimetype(original_name),
                    size: fileBuffer.length,
                    path: tempFilePath
                };

                // Upload the file using standard upload logic
                const record = await uploadFile(mockFile, userId, { overwrite: true, folderId: folderIdToUse });
                extractedFiles.push(record);
            }
        }

        // 4. Cleanup original zip if requested
        if (String(deleteOriginal) === 'true') {
            await deleteFile(fileId);
        }

        return {
            message: `Successfully extracted ${extractedFiles.length} file(s)`,
            files: extractedFiles
        };
    } finally {
        // Clean up temp zip file if downloaded from Supabase
        if (supabase && fs.existsSync(localZipPath)) {
            try { fs.unlinkSync(localZipPath); } catch (_) {}
        }
    }
}

async function compressFiles(fileIds, archiveName, targetFolderId, userId) {
    const AdmZip = require('adm-zip');
    
    // Fetch files from DB
    const result = await db.query(
        'SELECT * FROM files WHERE id = ANY($1::int[]) AND is_deleted = false',
        [fileIds]
    );
    const matchedFiles = result.rows;

    if (matchedFiles.length === 0) {
        throw new Error('No valid files selected for compression');
    }

    // Default archive name
    let finalArchiveName = archiveName ? archiveName.trim() : 'archive.zip';
    if (!finalArchiveName.toLowerCase().endsWith('.zip')) {
        finalArchiveName += '.zip';
    }

    const tempDir = path.join(uploadsDir, 'temp_zip');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const zip = new AdmZip();

    // Download/Locate each file and add to ZIP
    for (const file of matchedFiles) {
        if (supabase) {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .download(file.storage_path);
            if (error) {
                console.error(`Failed to download "${file.original_name}" for compression:`, error.message);
                continue;
            }
            const buffer = Buffer.from(await data.arrayBuffer());
            zip.addFile(file.original_name, buffer);
        } else {
            const filePath = path.join(uploadsDir, file.storage_path);
            if (fs.existsSync(filePath)) {
                zip.addLocalFile(filePath, '', file.original_name);
            }
        }
    }

    // Write ZIP to a temp path
    const tempZipPath = path.join(tempDir, `compress_${Date.now()}_${finalArchiveName}`);
    zip.writeZip(tempZipPath);

    // Upload zip as a new file in the library
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
    moveFiles,
    extractZip,
    compressFiles,
    updateFileExpiry
};
