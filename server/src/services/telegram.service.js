const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

let bot = null;
let isMockMode = false;
const token = process.env.TELEGRAM_BOT_TOKEN;

function initTelegram() {
    if (token) {
        console.log('Telegram Bot Token detected. Initializing Telegram bot...');
        try {
            // Using polling: false to avoid concurrency issues if another process is running it,
            // since we only broadcast announcements and do not need to process incoming commands.
            bot = new TelegramBot(token, { polling: false });
            console.log('✅ Telegram Bot service initialized.');
        } catch (err) {
            console.error('⚠️ Failed to initialize Telegram bot. Running in Mock Mode.', err.message);
            isMockMode = true;
        }
    } else {
        console.log('⚠️ TELEGRAM_BOT_TOKEN not set. Telegram service will run in Mock Mode.');
        isMockMode = true;
    }
}

async function sendMessageToGroup(chatId, message, filePath = null) {
    console.log(`Sending Telegram message to chat: ${chatId}`);
    
    // Parse topic ID / thread ID if present (e.g. -1001234567890/45)
    let finalChatId = chatId;
    let threadId = undefined;
    if (typeof chatId === 'string' && chatId.includes('/')) {
        const parts = chatId.split('/');
        finalChatId = parts[0];
        if (parts[1]) {
            threadId = parseInt(parts[1], 10);
            if (isNaN(threadId)) {
                threadId = undefined;
            }
        }
    }

    // Normalize filePath to an array of objects
    let files = [];
    if (filePath) {
        const rawFiles = Array.isArray(filePath) ? filePath : [filePath];
        files = rawFiles.map(item => {
            if (typeof item === 'string') {
                return { path: item, originalName: path.basename(item) };
            }
            return item;
        });
    }

    if (isMockMode || !bot) {
        console.log(`[MOCK TELEGRAM] Sending message to ${finalChatId} (thread: ${threadId || 'general'}):`);
        console.log(message);
        files.forEach((f, index) => {
            console.log(`[MOCK TELEGRAM] Attachment path ${index + 1}: ${f.path} (Original Name: ${f.originalName})`);
        });
        
        // Simulating delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, messageId: `mock-tg-id-${Date.now()}` };
    }

    const caption = (message && message.trim()) ? message : undefined;
    const parseMode = caption ? 'Markdown' : undefined;

    if (files.length === 0 && !caption) {
        throw new Error('Cannot broadcast an empty text notice without file attachments.');
    }

    try {
        let sentMsg;
        if (files.length > 0) {
            // Verify existing files
            const existingFiles = files.filter(f => fs.existsSync(f.path));
            if (existingFiles.length === 0) {
                sentMsg = await bot.sendMessage(finalChatId, message, {
                    parse_mode: 'Markdown',
                    message_thread_id: threadId
                });
                return { success: true, messageId: sentMsg.message_id };
            }

            if (existingFiles.length === 1) {
                // Single file: send with caption
                const f0 = existingFiles[0];
                const ext = path.extname(f0.path).toLowerCase();
                const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
                if (isImage) {
                    sentMsg = await bot.sendPhoto(finalChatId, fs.createReadStream(f0.path), {
                        caption: caption,
                        parse_mode: parseMode,
                        message_thread_id: threadId
                    });
                } else {
                    sentMsg = await bot.sendDocument(finalChatId, fs.createReadStream(f0.path), {
                        caption: caption,
                        parse_mode: parseMode,
                        message_thread_id: threadId
                    }, {
                        filename: f0.originalName
                    });
                }
            } else {
                // Group by type: photos/videos vs audios vs documents
                const photosAndVideos = [];
                const audios = [];
                const documents = [];

                for (const f of existingFiles) {
                    const ext = path.extname(f.path).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.avi'].includes(ext)) {
                        photosAndVideos.push(f);
                    } else if (['.mp3', '.m4a', '.ogg', '.wav'].includes(ext)) {
                        audios.push(f);
                    } else {
                        documents.push(f);
                    }
                }

                let captionSent = false;

                // Send Photos & Videos
                if (photosAndVideos.length > 0) {
                    if (photosAndVideos.length === 1) {
                        const f0 = photosAndVideos[0];
                        sentMsg = await bot.sendPhoto(finalChatId, fs.createReadStream(f0.path), {
                            caption: !captionSent ? caption : undefined,
                            parse_mode: !captionSent ? parseMode : undefined,
                            message_thread_id: threadId
                        });
                        captionSent = true;
                    } else {
                        for (let i = 0; i < photosAndVideos.length; i += 10) {
                            const chunk = photosAndVideos.slice(i, i + 10);
                            const mediaGroup = chunk.map((f, idx) => {
                                const ext = path.extname(f.path).toLowerCase();
                                const isVideo = ['.mp4', '.mov', '.avi'].includes(ext);
                                return {
                                    type: isVideo ? 'video' : 'photo',
                                    media: fs.createReadStream(f.path),
                                    caption: (!captionSent && idx === 0) ? caption : undefined,
                                    parse_mode: (!captionSent && idx === 0) ? parseMode : undefined,
                                    fileOptions: {
                                        filename: f.originalName
                                    }
                                };
                            });
                            const msgs = await bot.sendMediaGroup(finalChatId, mediaGroup, {
                                message_thread_id: threadId
                            });
                            if (!sentMsg) sentMsg = msgs[0];
                            captionSent = true;
                        }
                    }
                }

                // Send Audios
                if (audios.length > 0) {
                    if (audios.length === 1) {
                        const f0 = audios[0];
                        const tempMsg = await bot.sendAudio(finalChatId, fs.createReadStream(f0.path), {
                            caption: !captionSent ? caption : undefined,
                            parse_mode: !captionSent ? parseMode : undefined,
                            message_thread_id: threadId
                        });
                        if (!sentMsg) sentMsg = tempMsg;
                        captionSent = true;
                    } else {
                        for (let i = 0; i < audios.length; i += 10) {
                            const chunk = audios.slice(i, i + 10);
                            const mediaGroup = chunk.map((f, idx) => ({
                                type: 'audio',
                                media: fs.createReadStream(f.path),
                                caption: (!captionSent && idx === 0) ? caption : undefined,
                                parse_mode: (!captionSent && idx === 0) ? parseMode : undefined,
                                fileOptions: {
                                    filename: f.originalName
                                }
                            }));
                            const msgs = await bot.sendMediaGroup(finalChatId, mediaGroup, {
                                message_thread_id: threadId
                            });
                            if (!sentMsg) sentMsg = msgs[0];
                            captionSent = true;
                        }
                    }
                }

                // Send Documents
                if (documents.length > 0) {
                    if (documents.length === 1) {
                        const f0 = documents[0];
                        const tempMsg = await bot.sendDocument(finalChatId, fs.createReadStream(f0.path), {
                            caption: !captionSent ? caption : undefined,
                            parse_mode: !captionSent ? parseMode : undefined,
                            message_thread_id: threadId
                        }, {
                            filename: f0.originalName
                        });
                        if (!sentMsg) sentMsg = tempMsg;
                        captionSent = true;
                    } else {
                        for (let i = 0; i < documents.length; i += 10) {
                            const chunk = documents.slice(i, i + 10);
                            const mediaGroup = chunk.map((f, idx) => ({
                                type: 'document',
                                media: fs.createReadStream(f.path),
                                caption: (!captionSent && idx === 0) ? caption : undefined,
                                parse_mode: (!captionSent && idx === 0) ? parseMode : undefined,
                                fileOptions: {
                                    filename: f.originalName
                                }
                            }));
                            const msgs = await bot.sendMediaGroup(finalChatId, mediaGroup, {
                                message_thread_id: threadId
                            });
                            if (!sentMsg) sentMsg = msgs[0];
                            captionSent = true;
                        }
                    }
                }
            }
        } else {
            sentMsg = await bot.sendMessage(finalChatId, message, {
                parse_mode: 'Markdown',
                message_thread_id: threadId
            });
        }

        return { success: true, messageId: sentMsg?.message_id || 'tg-msg-id' };
    } catch (err) {
        console.error(`Error sending Telegram message to ${chatId}:`, err.message);
        throw err;
    }
}

module.exports = {
    initTelegram,
    sendMessageToGroup,
    isMock: () => isMockMode
};
