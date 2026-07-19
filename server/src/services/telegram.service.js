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
        if (process.env.NODE_ENV === 'test') {
            console.log(`[MOCK TELEGRAM] Sending message to ${finalChatId} (thread: ${threadId || 'general'}):`);
            console.log(message);
            files.forEach((f, index) => {
                console.log(`[MOCK TELEGRAM] Attachment path ${index + 1}: ${f.path} (Original Name: ${f.originalName})`);
            });
            
            return { success: true, messageId: `mock-tg-id-${Date.now()}` };
        }
        throw new Error('Telegram service is not configured or is currently disconnected (running in Mock Mode). Please check your bot token.');
    }

    const caption = (message && message.trim()) ? message : undefined;
    const isHtml = message && (message.startsWith('<') || /<[a-z][\s\S]*>/i.test(message));
    const defaultParseMode = isHtml ? 'HTML' : 'Markdown';
    const parseMode = caption ? defaultParseMode : undefined;

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
                    parse_mode: defaultParseMode,
                    message_thread_id: threadId
                });
                return { success: true, messageId: sentMsg.message_id };
            }

            if (existingFiles.length === 1) {
                // Single file: send with caption
                const f0 = existingFiles[0];
                const ext = path.extname(f0.path).toLowerCase();
                const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
                const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
                const isAudio = ['.mp3', '.m4a', '.ogg', '.wav', '.flac'].includes(ext);

                if (isImage) {
                    sentMsg = await bot.sendPhoto(finalChatId, fs.createReadStream(f0.path), {
                        caption: caption,
                        parse_mode: parseMode,
                        message_thread_id: threadId
                    });
                } else if (isVideo) {
                    sentMsg = await bot.sendVideo(finalChatId, fs.createReadStream(f0.path), {
                        caption: caption,
                        parse_mode: parseMode,
                        message_thread_id: threadId
                    });
                } else if (isAudio) {
                    sentMsg = await bot.sendAudio(finalChatId, fs.createReadStream(f0.path), {
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
                // Multiple files: send text message first, then files sequentially to prevent AggregateError
                if (caption) {
                    sentMsg = await bot.sendMessage(finalChatId, caption, {
                        parse_mode: parseMode,
                        message_thread_id: threadId
                    });
                }

                for (const f of existingFiles) {
                    const ext = path.extname(f.path).toLowerCase();
                    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
                    const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
                    const isAudio = ['.mp3', '.m4a', '.ogg', '.wav', '.flac'].includes(ext);

                    let tempMsg;
                    if (isImage) {
                        tempMsg = await bot.sendPhoto(finalChatId, fs.createReadStream(f.path), {
                            message_thread_id: threadId
                        });
                    } else if (isVideo) {
                        tempMsg = await bot.sendVideo(finalChatId, fs.createReadStream(f.path), {
                            message_thread_id: threadId
                        });
                    } else if (isAudio) {
                        tempMsg = await bot.sendAudio(finalChatId, fs.createReadStream(f.path), {
                            message_thread_id: threadId
                        });
                    } else {
                        tempMsg = await bot.sendDocument(finalChatId, fs.createReadStream(f.path), {
                            message_thread_id: threadId
                        }, {
                            filename: f.originalName
                        });
                    }
                    if (tempMsg) {
                        sentMsg = tempMsg;
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
