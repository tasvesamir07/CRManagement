const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

const isVercel = !!process.env.VERCEL;
const tempDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '../../../uploads/temp');
if (!fs.existsSync(tempDir)) {
    try {
        fs.mkdirSync(tempDir, { recursive: true });
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to create temp directory');
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv',
            'application/zip',
            'application/x-zip-compressed',
            'application/x-zip',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (!allowed.includes(file.mimetype)) {
            const err = new Error(`File type ${file.mimetype} is not allowed. Allowed: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT, CSV`);
            err.code = 'LIMIT_UNEXPECTED_FILE_TYPE';
            return cb(err, false);
        }
        cb(null, true);
    }
});

module.exports = upload;
