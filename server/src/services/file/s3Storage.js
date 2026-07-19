const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const logger = require('../../config/logger');

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || 'auto';
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

let s3Client = null;
let isConfigured = false;

if (endpoint && bucket && accessKeyId && secretAccessKey) {
    try {
        s3Client = new S3Client({
            endpoint,
            region,
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle,
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED'
        });
        isConfigured = true;
        logger.info({ endpoint, bucket }, 'S3-compatible storage configured');
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to initialize S3 client');
    }
}

async function uploadToS3(filePath, storagePath, contentType) {
    if (!isConfigured) throw new Error('S3 storage not configured');
    const fileStream = fs.createReadStream(filePath);
    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: bucket,
            Key: storagePath,
            Body: fileStream,
            ContentType: contentType || 'application/octet-stream'
        },
        queueSize: 4,
        leavePartsOnError: false
    });
    await upload.done();
    return storagePath;
}

async function deleteFromS3(storagePath) {
    if (!isConfigured) return;
    await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: storagePath
    }));
}

async function getDownloadUrlFromS3(storagePath, expiresIn = 3600) {
    if (!isConfigured) throw new Error('S3 storage not configured');
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: storagePath
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

async function downloadFromS3(storagePath) {
    if (!isConfigured) throw new Error('S3 storage not configured');
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: storagePath
    }));
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function ensureFolderInS3(folderName) {
    if (!isConfigured || !folderName) return;
    const cleanName = folderName.replace(/[\/\\?%*:|"<>]/g, '_');
    await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${cleanName}/`,
        Body: ''
    })).catch(() => {});
}

async function deleteFolderFromS3(folderName) {
    if (!isConfigured || !folderName) return;
    const cleanName = folderName.replace(/[\/\\?%*:|"<>]/g, '_');
    const listed = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${cleanName}/`
    }));
    if (listed.Contents && listed.Contents.length > 0) {
        await s3Client.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
                Objects: listed.Contents.map(obj => ({ Key: obj.Key })),
                Quiet: true
            }
        }));
    }
}

module.exports = {
    isS3Configured: isConfigured,
    uploadToS3,
    deleteFromS3,
    getDownloadUrlFromS3,
    downloadFromS3,
    ensureFolderInS3,
    deleteFolderFromS3
};
