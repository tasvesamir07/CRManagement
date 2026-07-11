const fs = require('fs');
const path = require('path');

async function compressImage(file, originalName) {
    const sharp = require('sharp');
    const imageQuality = parseInt(process.env.IMAGE_QUALITY || '80');
    const pipeline = sharp(file.path).rotate().webp({ quality: imageQuality });
    const compressedBuffer = await pipeline.toBuffer();
    fs.writeFileSync(file.path, compressedBuffer);
    const newSize = compressedBuffer.length;
    console.log(`[Image Compression] Converted & Compressed image "${originalName}" size: ${newSize} bytes.`);
    return newSize;
}

async function compressPptx(file, originalName) {
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
                compressedBuffer = await sharp(originalBuffer)
                    .png({ quality: 75, compressionLevel: 8, palette: true })
                    .toBuffer();
            } else {
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
        const savedPercentage = originalBytes > 0 ? ((originalBytes - compressedBytes) / originalBytes * 100).toFixed(1) : '0';
        console.log(`[PPTX Compression] Compressed ${compressedCount} images in "${originalName}". New size: ${stats.size} bytes. Saved ${savedPercentage}% of media bytes.`);
        return stats.size;
    }
    return file.size;
}

async function compressPdf(file, originalName) {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    let gsInstalled = false;
    try {
        await execPromise('gs --version');
        gsInstalled = true;
    } catch (_) {}

    if (!gsInstalled) {
        console.log(`[PDF Compression] Ghostscript (gs) is not installed on this system. Skipping PDF compression.`);
        return file.size;
    }

    const tempOutputPath = file.path + '.compressed.pdf';
    const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${file.path}"`;

    await execPromise(gsCommand);

    if (fs.existsSync(tempOutputPath)) {
        const originalStats = fs.statSync(file.path);
        const compressedStats = fs.statSync(tempOutputPath);
        if (compressedStats.size < originalStats.size) {
            fs.unlinkSync(file.path);
            fs.renameSync(tempOutputPath, file.path);
            console.log(`[PDF Compression] Compressed PDF "${originalName}" from ${originalStats.size} to ${compressedStats.size} bytes.`);
            return compressedStats.size;
        }
        fs.unlinkSync(tempOutputPath);
        console.log(`[PDF Compression] Compression did not reduce size for "${originalName}". Keeping original.`);
    }
    return file.size;
}

module.exports = { compressImage, compressPptx, compressPdf };
