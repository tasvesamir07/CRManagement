const path = require('path');

/**
 * Returns the MIME type corresponding to a given file path or extension.
 * @param {string} filePathOrExt 
 * @returns {string}
 */
function getMimeType(filePathOrExt) {
    if (!filePathOrExt) return 'application/octet-stream';
    const ext = (filePathOrExt.includes('.') ? path.extname(filePathOrExt) : filePathOrExt).toLowerCase();
    switch (ext) {
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.pdf':
            return 'application/pdf';
        case '.doc':
        case '.docx':
            return 'application/msword';
        case '.mp4':
            return 'video/mp4';
        default:
            return 'application/octet-stream';
    }
}

module.exports = {
    getMimeType
};
