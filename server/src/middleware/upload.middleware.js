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

/**
 * Inspect file content header (magic bytes) to verify claimed file type
 * and strictly block disguised executables or malformed payloads.
 */
function inspectFile(file) {
    if (!file || !file.path || !fs.existsSync(file.path)) return { valid: true };
    const originalName = file.originalname || '';
    
    // Null byte injection check
    if (originalName.includes('\0')) {
        return { valid: false, reason: 'Invalid characters detected in filename.' };
    }

    const ext = path.extname(originalName).toLowerCase();
    
    // Strict blacklist of executable, script, and macro-enabled extensions
    const dangerousExtensions = [
        '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.pl',
        '.cgi', '.py', '.js', '.mjs', '.vbs', '.scr', '.msi', '.dll',
        '.hta', '.com', '.jar', '.vbe', '.wsf', '.wsh', '.ps1', '.html', '.htm', '.svg',
        '.docm', '.xlsm', '.pptm', '.dotm', '.xltm', '.xla', '.xlam', '.reg', '.vbe'
    ];
    if (dangerousExtensions.includes(ext)) {
        return { valid: false, reason: `File extension '${ext}' is prohibited for security.` };
    }

    // Check for double extension attacks (e.g., test.php.jpg or malicious.exe.png)
    const subExts = originalName.toLowerCase().split('.').slice(1, -1);
    for (const sub of subExts) {
        if (dangerousExtensions.includes('.' + sub)) {
            return { valid: false, reason: `Suspicious double extension '.${sub}' detected in filename.` };
        }
    }

    // Inspect first 16 bytes for magic byte verification
    let fd;
    const buffer = Buffer.alloc(16);
    try {
        fd = fs.openSync(file.path, 'r');
        fs.readSync(fd, buffer, 0, 16, 0);
    } catch (_) {
        return { valid: true };
    } finally {
        if (fd !== undefined) {
            try { fs.closeSync(fd); } catch (_) {}
        }
    }

    // JPEG: FF D8 FF
    if (ext === '.jpg' || ext === '.jpeg') {
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return { valid: true };
        return { valid: false, reason: 'File content does not match valid JPEG image format.' };
    }
    // PNG: 89 50 4E 47
    if (ext === '.png') {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return { valid: true };
        return { valid: false, reason: 'File content does not match valid PNG image format.' };
    }
    // GIF: 47 49 46 38
    if (ext === '.gif') {
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return { valid: true };
        return { valid: false, reason: 'File content does not match valid GIF image format.' };
    }
    // WebP: RIFF ... WEBP
    if (ext === '.webp') {
        if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { valid: true };
        return { valid: false, reason: 'File content does not match valid WebP image format.' };
    }
    // PDF: %PDF
    if (ext === '.pdf') {
        if (buffer.toString('ascii', 0, 4) === '%PDF') return { valid: true };
        return { valid: false, reason: 'File content does not match valid PDF document format.' };
    }
    // ZIP / Office OpenXML (.docx, .xlsx, .pptx): PK
    if (['.zip', '.docx', '.xlsx', '.pptx'].includes(ext)) {
        if (buffer[0] === 0x50 && buffer[1] === 0x4B) return { valid: true };
        return { valid: false, reason: `File content does not match valid archive/document format for '${ext}'.` };
    }

    return { valid: true };
}

const validateFileInspection = (req, res, next) => {
    const filesToValidate = req.file ? [req.file] : (Array.isArray(req.files) ? req.files : []);
    for (const file of filesToValidate) {
        const check = inspectFile(file);
        if (!check.valid) {
            try {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch (_) {}
            return res.status(400).json({ error: check.reason });
        }
    }
    next();
};

upload.validateFileInspection = validateFileInspection;
upload.inspectFile = inspectFile;

module.exports = upload;
