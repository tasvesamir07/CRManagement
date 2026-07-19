const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const logger = require('../../config/logger');
const {
    isS3Configured, uploadToS3, deleteFromS3, getDownloadUrlFromS3,
    downloadFromS3, ensureFolderInS3, deleteFolderFromS3
} = require('./s3Storage');

let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'announcement-files';

if (supabaseUrl && supabaseKey) {
    logger.info('Supabase Storage configurations detected. Initializing Supabase client...');
    const cleanSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    supabase = createClient(cleanSupabaseUrl, supabaseKey, {
        realtime: { transport: WebSocket }
    });
}

const isVercel = !!process.env.VERCEL;
const uploadsDir = isVercel
    ? '/tmp/uploads'
    : path.join(__dirname, '../../../../uploads');

if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
        logger.error({ err }, 'Failed to create uploads directory');
    }
}

function getExpiryDate() {
    const days = parseInt(process.env.FILE_EXPIRY_DAYS || '15');
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
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

const storageBackend = isS3Configured ? 'S3' : (supabase ? 'Supabase' : 'Local');

async function uploadToStorage(filePath, storagePath, fileType) {
    if (isS3Configured) {
        return uploadToS3(filePath, storagePath, fileType);
    }
    if (supabase) {
        const fileBuffer = fs.readFileSync(filePath);
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(storagePath, fileBuffer, {
                contentType: fileType,
                duplex: 'half',
                upsert: true
            });
        if (error) throw new Error(`Supabase upload failed: ${error.message}`);
        return data?.path || storagePath;
    }
    const finalPath = path.join(uploadsDir, storagePath);
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(finalPath)) {
        try { fs.unlinkSync(finalPath); } catch (_) {}
    }
    fs.renameSync(filePath, finalPath);
    return storagePath;
}

async function deleteFromStorage(storagePath) {
    if (isS3Configured) {
        await deleteFromS3(storagePath);
        return;
    }
    if (supabase) {
        const { error } = await supabase.storage.from(bucketName).remove([storagePath]);
        if (error) logger.error({ error: error.message }, 'Failed to remove file from Supabase storage');
        return;
    }
    const filePath = path.join(uploadsDir, storagePath);
    if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (err) {
            logger.error({ err }, 'Failed to remove local file from disk');
        }
    }
}

async function getDownloadUrl(storagePath, hostUrl = '') {
    if (isS3Configured) {
        return getDownloadUrlFromS3(storagePath);
    }
    if (supabase) {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(storagePath, 3600);
        if (error) throw new Error(`Failed to generate download URL: ${error.message}`);
        return data.signedUrl;
    }
    const cleanHost = hostUrl.replace(/\/$/, '');
    return `${cleanHost}/uploads/${storagePath}`;
}

async function downloadFromStorage(storagePath) {
    if (isS3Configured) {
        return downloadFromS3(storagePath);
    }
    if (supabase) {
        const { data, error } = await supabase.storage.from(bucketName).download(storagePath);
        if (error) throw new Error(`Failed to download from Supabase: ${error.message}`);
        const buffer = Buffer.from(await data.arrayBuffer());
        return buffer;
    }
    const filePath = path.join(uploadsDir, storagePath);
    return fs.readFileSync(filePath);
}

async function ensureFolderInStorage(folderName) {
    const cleanFolderName = folderName.replace(/[\/\\?%*:|"<>]/g, '_');
    if (!cleanFolderName) return;

    if (isS3Configured) {
        await ensureFolderInS3(cleanFolderName);
        return;
    }
    if (supabase) {
        const placeholderPath = `${cleanFolderName}/.emptyFolderPlaceholder`;
        await supabase.storage.from(bucketName).upload(placeholderPath, Buffer.from(''), {
            contentType: 'application/octet-stream', upsert: true
        }).catch(err => logger.error({ err }, 'Failed to create folder placeholder in Supabase'));
        return;
    }
    const folderDirPath = path.join(uploadsDir, cleanFolderName);
    if (!fs.existsSync(folderDirPath)) {
        fs.mkdirSync(folderDirPath, { recursive: true });
    }
}

async function deleteFolderFromStorage(folderName) {
    const cleanFolderName = folderName ? folderName.replace(/[\/\\?%*:|"<>]/g, '_') : '';
    if (!cleanFolderName) return;

    if (isS3Configured) {
        await deleteFolderFromS3(cleanFolderName);
        return;
    }
    if (supabase) {
        const { data: bucketFiles, error: listError } = await supabase.storage
            .from(bucketName).list(cleanFolderName);
        if (!listError && bucketFiles && bucketFiles.length > 0) {
            const pathsToDelete = bucketFiles.map(f => `${cleanFolderName}/${f.name}`);
            await supabase.storage.from(bucketName).remove(pathsToDelete);
        }
        await supabase.storage.from(bucketName).remove([`${cleanFolderName}/.emptyFolderPlaceholder`]);
        return;
    }
    const folderDirPath = path.join(uploadsDir, cleanFolderName);
    if (fs.existsSync(folderDirPath)) {
        try { fs.rmSync(folderDirPath, { recursive: true, force: true }); } catch (err) {
            logger.error({ err }, 'Failed to delete local folder directory');
        }
    }
}

logger.info({ backend: storageBackend }, 'Storage backend');

module.exports = {
    supabase, uploadsDir, bucketName, getExpiryDate, getMimetype,
    uploadToStorage, deleteFromStorage, getDownloadUrl, downloadFromStorage,
    ensureFolderInStorage, deleteFolderFromStorage
};
