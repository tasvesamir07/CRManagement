const db = require('../config/database');
const fileService = require('./file.service');
const whatsappService = require('./whatsapp.service');
const telegramService = require('./telegram.service');
const messengerService = require('./messenger.service');
const path = require('path');
const fs = require('fs');
const auditService = require('./audit.service');

let wsBroadcaster = null;

function setWsBroadcaster(broadcaster) {
    wsBroadcaster = broadcaster;
}

function broadcastAnnouncementStatus(announcementId, status, sentAt, delivery = []) {
    if (wsBroadcaster) {
        wsBroadcaster({
            type: 'announcement_status',
            data: {
                id: announcementId,
                status,
                sent_at: sentAt,
                delivery
            }
        });
    }
}

async function createAnnouncement({ title, content, category, course_id, custom_room, custom_time, file_id, file_ids, created_by, platform_ids }) {
    // 1. Insert announcement
    const result = await db.query(
        'INSERT INTO announcements (title, content, category, course_id, custom_room, custom_time, file_id, file_ids, created_by, status) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [title, content, category, course_id || null, custom_room || null, custom_time || null, file_id || null, file_ids || [], created_by, 'draft']
    );
    const announcement = result.rows[0];

    // 2. Link selected platforms in pending status
    if (platform_ids && platform_ids.length > 0) {
        for (const pid of platform_ids) {
            await db.query(
                'INSERT INTO announcement_platforms (announcement_id, platform_id, platform_status) VALUES ($1, $2, $3)',
                [announcement.id, pid, 'pending']
            );
        }
    }

    return announcement;
}

// Format message for WhatsApp (returns the pre-compiled frontend content to avoid repetition)
function formatWhatsApp(announcement, _course) {
    if (announcement.category === 'share_file') {
        return announcement.content === 'Shared File(s)' ? '' : (announcement.content || '');
    }
    return announcement.content;
}

// Format message for Telegram (returns the pre-compiled frontend content to avoid repetition)
function formatTelegram(announcement, _course) {
    if (announcement.category === 'share_file') {
        return announcement.content === 'Shared File(s)' ? '' : (announcement.content || '');
    }
    return announcement.content;
}

// Format message for Messenger
function formatMessenger(announcement, _course) {
    if (announcement.category === 'share_file') {
        return announcement.content === 'Shared File(s)' ? '' : (announcement.content || '');
    }
    return announcement.content;
}

async function sendAnnouncement(id, _hostUrl = '') {
    // 1. Fetch announcement details
    const annResult = await db.query('SELECT * FROM announcements WHERE id = $1', [id]);
    if (annResult.rows.length === 0) {
        throw new Error('Announcement not found');
    }
    const announcement = annResult.rows[0];

    // 2. Fetch related data
    let course = null;
    if (announcement.course_id) {
        const courseRes = await db.query('SELECT * FROM courses WHERE id = $1', [announcement.course_id]);
        course = courseRes.rows[0];
    }

    // Fetch related files
    let files = [];
    const attachmentFiles = [];
    
    if (announcement.file_ids && announcement.file_ids.length > 0) {
        const filesRes = await db.query('SELECT * FROM files WHERE id = ANY($1) AND is_deleted = false', [announcement.file_ids]);
        files = filesRes.rows;
    } else if (announcement.file_id) {
        const fileRes = await db.query('SELECT * FROM files WHERE id = $1 AND is_deleted = false', [announcement.file_id]);
        if (fileRes.rows.length > 0) {
            files = [fileRes.rows[0]];
        }
    }

    for (const f of files) {
        let localFilePath = null;
        if (!process.env.SUPABASE_URL) {
            localFilePath = path.join(fileService.uploadsDir, f.storage_path);
        } else {
            try {
                const { url } = await fileService.getFileUrl(f.id);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);
                const tempPath = path.join(fileService.uploadsDir, `temp-${f.storage_path}`);
                const writeStream = fs.createWriteStream(tempPath);
                await new Promise((resolve, reject) => {
                    response.body.pipe(writeStream);
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                localFilePath = tempPath;
            } catch (e) {
                console.error(`Failed to download Supabase file ${f.id} for sending:`, e.message);
            }
        }
        if (localFilePath) {
            attachmentFiles.push({
                path: localFilePath,
                originalName: f.original_name
            });
        }
    }

    // 3. Fetch targeted platforms
    const platformsResult = await db.query(
        'SELECT ap.*, p.platform_name, p.platform_type, p.chat_id, p.is_active \
         FROM announcement_platforms ap \
         JOIN platforms p ON ap.platform_id = p.id \
         WHERE ap.announcement_id = $1',
        [id]
    );
    const platforms = platformsResult.rows;

    if (platforms.length === 0) {
        throw new Error('No delivery platforms selected for this announcement');
    }

    // Validate platforms are active before sending
    for (const p of platforms) {
        if (!p.is_active) {
            throw new Error(`Platform "${p.platform_name}" is not active. Please enable it before sending.`);
        }
    }

    // Check if all platforms are in mock mode
    const nonMockPlatforms = platforms.filter(p => {
        if (p.platform_type === 'whatsapp' && !whatsappService.isMock()) return true;
        if (p.platform_type === 'telegram' && !telegramService.isMock()) return true;
        if (p.platform_type === 'messenger' && !messengerService.isMock()) return true;
        return false;
    });
    if (nonMockPlatforms.length === 0) {
        throw new Error('All selected platforms are in mock mode. No real delivery channels available.');
    }

    let overallSuccessCount = 0;
    let overallFailureCount = 0;

    // 4. Broadcaster to selected platforms
    for (const p of platforms) {
        try {
            await db.query(
                'UPDATE announcement_platforms SET platform_status = $1 WHERE announcement_id = $2 AND platform_id = $3',
                ['sending', id, p.platform_id]
            );

            // Broadcast intermediate sending status
            const currentDelivery = await db.query(
                'SELECT ap.*, p.platform_name, p.platform_type FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1',
                [id]
            );
            broadcastAnnouncementStatus(id, 'sending', null, currentDelivery.rows);

            if (p.platform_type === 'whatsapp') {
                const message = formatWhatsApp(announcement, course);
                await whatsappService.sendMessageToGroup(p.chat_id, message, attachmentFiles);
            } else if (p.platform_type === 'telegram') {
                const message = formatTelegram(announcement, course);
                await telegramService.sendMessageToGroup(p.chat_id, message, attachmentFiles);
            } else if (p.platform_type === 'messenger') {
                const message = formatMessenger(announcement, course);
                await messengerService.sendMessageToGroup(p.chat_id, message, attachmentFiles);
            }

            // Update on success
            await db.query(
                'UPDATE announcement_platforms SET platform_status = $1, sent_at = NOW() WHERE announcement_id = $2 AND platform_id = $3',
                ['sent', id, p.platform_id]
            );
            overallSuccessCount++;

            // Log successful delivery to audit logs
            await auditService.log(
                announcement.created_by,
                'announcement.delivery_sent',
                'announcement',
                id,
                {
                    platform_id: p.platform_id,
                    platform_name: p.platform_name,
                    platform_type: p.platform_type,
                    chat_id: p.chat_id
                }
            );
        } catch (err) {
            console.error(`Failed delivery to platform ID ${p.platform_id}:`, err.message);
            await db.query(
                'UPDATE announcement_platforms SET platform_status = $1, error_message = $2 WHERE announcement_id = $3 AND platform_id = $4',
                ['failed', err.message, id, p.platform_id]
            );
            overallFailureCount++;

            // Log delivery failure to audit logs
            await auditService.log(
                announcement.created_by,
                'announcement.delivery_failed',
                'announcement',
                id,
                {
                    platform_id: p.platform_id,
                    platform_name: p.platform_name,
                    platform_type: p.platform_type,
                    chat_id: p.chat_id,
                    error: err.message
                }
            );
        }
    }

    // Clean up downloaded temp files if any
    if (process.env.SUPABASE_URL && attachmentFiles.length > 0) {
        for (const f of attachmentFiles) {
            try {
                if (fs.existsSync(f.path)) {
                    fs.unlinkSync(f.path);
                }
            } catch (e) {
                console.error('Failed to delete temp file:', e.message);
            }
        }
    }

    // 5. Update final announcement status
    let finalStatus = 'sent';
    if (overallSuccessCount === 0) {
        finalStatus = 'failed';
    } else if (overallFailureCount > 0) {
        finalStatus = 'partial';
    }

    const finalResult = await db.query(
        'UPDATE announcements SET status = $1, sent_at = NOW() WHERE id = $2 RETURNING *',
        [finalStatus, id]
    );

    // Log the overall broadcast completion status
    await auditService.log(
        announcement.created_by,
        'announcement.broadcast_completed',
        'announcement',
        id,
        {
            status: finalStatus,
            success_count: overallSuccessCount,
            failure_count: overallFailureCount
        }
    );

    // Fetch the updated delivery list to broadcast final status
    const updatedDelivery = await db.query(
        'SELECT ap.*, p.platform_name, p.platform_type FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1',
        [id]
    );
    broadcastAnnouncementStatus(id, finalStatus, finalResult.rows[0].sent_at, updatedDelivery.rows);

    return {
        announcement: finalResult.rows[0],
        successCount: overallSuccessCount,
        failureCount: overallFailureCount
    };
}

async function getAnnouncements({ page = 1, limit = 50, search, status, course_id, date_from, date_to, userId } = {}) {
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (userId) {
        whereClauses.push(`(a.course_id IN (SELECT course_id FROM course_members WHERE user_id = $${paramIndex}) OR a.created_by = $${paramIndex})`);
        paramIndex++;
        params.push(userId);
    }

    if (status) {
        whereClauses.push(`a.status = $${paramIndex++}`);
        params.push(status);
    }
    if (course_id) {
        whereClauses.push(`a.course_id = $${paramIndex++}`);
        params.push(course_id);
    }
    if (search) {
        whereClauses.push(`(a.title ILIKE $${paramIndex} OR a.content ILIKE $${paramIndex})`);
        paramIndex++;
        params.push(`%${search}%`);
    }
    if (date_from) {
        whereClauses.push(`a.created_at >= $${paramIndex++}`);
        params.push(date_from);
    }
    if (date_to) {
        whereClauses.push(`a.created_at <= $${paramIndex++}`);
        params.push(date_to);
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total with same filters
    const countResult = await db.query(
        `SELECT COUNT(*) FROM announcements a ${whereSQL}`,
        params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Fetch announcements
    const result = await db.query(
        `SELECT a.*, c.course_id as c_id, c.course_name, u.display_name as created_by_name \
         FROM announcements a \
         LEFT JOIN courses c ON a.course_id = c.id \
         LEFT JOIN users u ON a.created_by = u.id \
         ${whereSQL} \
         ORDER BY a.created_at DESC \
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );
    const announcements = result.rows;

    if (announcements.length === 0) {
        return { announcements, totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) };
    }

    // Batch fetch delivery statuses (fix N+1)
    const annIds = announcements.map(a => a.id);
    const apResult = await db.query(
        'SELECT ap.*, p.platform_name, p.platform_type FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = ANY($1)',
        [annIds]
    );

    const deliveryMap = {};
    for (const row of apResult.rows) {
        if (!deliveryMap[row.announcement_id]) {
            deliveryMap[row.announcement_id] = [];
        }
        deliveryMap[row.announcement_id].push(row);
    }

    // Batch fetch file details
    const allFileIds = [];
    for (const ann of announcements) {
        if (ann.file_ids && ann.file_ids.length > 0) {
            allFileIds.push(...ann.file_ids);
        } else if (ann.file_id) {
            allFileIds.push(ann.file_id);
        }
    }

    const filesMap = {};
    if (allFileIds.length > 0) {
        const uniqueFileIds = [...new Set(allFileIds)];
        const filesResult = await db.query(
            'SELECT * FROM files WHERE id = ANY($1) AND is_deleted = false',
            [uniqueFileIds]
        );
        for (const f of filesResult.rows) {
            filesMap[f.id] = f;
        }
    }

    // Attach delivery and files to each announcement
    for (const ann of announcements) {
        ann.delivery = deliveryMap[ann.id] || [];
        ann.files = [];
        if (ann.file_ids && ann.file_ids.length > 0) {
            for (const fid of ann.file_ids) {
                if (filesMap[fid]) {
                    ann.files.push(filesMap[fid]);
                }
            }
        } else if (ann.file_id && filesMap[ann.file_id]) {
            ann.files = [filesMap[ann.file_id]];
        }
    }

    return {
        announcements,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
    };
}

async function getAnnouncementById(id) {
    const result = await db.query(
        'SELECT a.*, c.course_id as c_id, c.course_name, u.display_name as created_by_name \
         FROM announcements a \
         LEFT JOIN courses c ON a.course_id = c.id \
         LEFT JOIN users u ON a.created_by = u.id \
         WHERE a.id = $1',
        [id]
    );
    if (result.rows.length === 0) return null;

    const ann = result.rows[0];

    // Fetch delivery status per platform
    const apResult = await db.query(
        'SELECT ap.*, p.platform_name, p.platform_type FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1',
        [id]
    );
    ann.delivery = apResult.rows;

    // Fetch files
    ann.files = [];
    if (ann.file_ids && ann.file_ids.length > 0) {
        const filesRes = await db.query(
            'SELECT * FROM files WHERE id = ANY($1) AND is_deleted = false',
            [ann.file_ids]
        );
        ann.files = filesRes.rows;
    } else if (ann.file_id) {
        const fileRes = await db.query(
            'SELECT * FROM files WHERE id = $1 AND is_deleted = false',
            [ann.file_id]
        );
        if (fileRes.rows.length > 0) {
            ann.files = [fileRes.rows[0]];
        }
    }

    return ann;
}

async function updateAnnouncement(id, { title, content, category, course_id, custom_room, custom_time, file_id, file_ids, platform_ids }) {
    // Only allow updating draft announcements
    const check = await db.query('SELECT status FROM announcements WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new Error('Announcement not found');
    }
    if (check.rows[0].status !== 'draft' && check.rows[0].status !== 'scheduled') {
        const status = check.rows[0].status;
        if (status === 'sent' || status === 'partial') {
            throw new Error('This notice has already been delivered and cannot be edited');
        }
        throw new Error('This notice cannot be edited');
    }

    const result = await db.query(
        'UPDATE announcements SET title=$1, content=$2, category=$3, course_id=$4, custom_room=$5, custom_time=$6, file_id=$7, file_ids=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
        [title, content, category, course_id || null, custom_room || null, custom_time || null, file_id || null, file_ids || [], id]
    );
    const announcement = result.rows[0];

    // Update platform links: delete existing, insert new
    await db.query('DELETE FROM announcement_platforms WHERE announcement_id = $1', [id]);
    if (platform_ids && platform_ids.length > 0) {
        for (const pid of platform_ids) {
            await db.query(
                'INSERT INTO announcement_platforms (announcement_id, platform_id, platform_status) VALUES ($1, $2, $3)',
                [id, pid, 'pending']
            );
        }
    }

    return announcement;
}

async function scheduleAnnouncement(id, scheduledAt) {
    const check = await db.query('SELECT status FROM announcements WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new Error('Announcement not found');
    }

    const result = await db.query(
        'UPDATE announcements SET scheduled_at = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [scheduledAt, 'scheduled', id]
    );

    return result.rows[0];
}

async function getDueScheduledAnnouncements() {
    const result = await db.query(
        `SELECT a.*, c.course_id as c_id, c.course_name
         FROM announcements a
         LEFT JOIN courses c ON a.course_id = c.id
         WHERE a.status = 'scheduled' AND a.scheduled_at <= NOW()`
    );
    return result.rows;
}

async function markAnnouncementSending(id) {
    await db.query(
        "UPDATE announcements SET status = 'sending', updated_at = NOW() WHERE id = $1",
        [id]
    );
    broadcastAnnouncementStatus(id, 'sending', null);
}

async function markAnnouncementFailed(id) {
    await db.query(
        "UPDATE announcements SET status = 'failed', updated_at = NOW() WHERE id = $1",
        [id]
    );
    broadcastAnnouncementStatus(id, 'failed', null);
}

async function deleteAnnouncement(id) {
    await db.query('DELETE FROM announcement_platforms WHERE announcement_id = $1', [id]);
    const result = await db.query('DELETE FROM announcements WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
}

module.exports = {
    createAnnouncement,
    sendAnnouncement,
    getAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    scheduleAnnouncement,
    getDueScheduledAnnouncements,
    markAnnouncementSending,
    markAnnouncementFailed,
    deleteAnnouncement,
    formatWhatsApp,
    formatTelegram,
    formatMessenger,
    setWsBroadcaster
};
