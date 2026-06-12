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

    try {
        let sentMsg;
        if (files.length === 1 && fs.existsSync(files[0].path)) {
            const ext = path.extname(files[0].path).toLowerCase();
            const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            if (isImage) {
                sentMsg = await bot.sendPhoto(finalChatId, fs.createReadStream(files[0].path), {
                    caption: message,
                    parse_mode: 'Markdown',
                    message_thread_id: threadId
                });
            } else {
                sentMsg = await bot.sendDocument(finalChatId, fs.createReadStream(files[0].path), {
                    caption: message,
                    parse_mode: 'Markdown',
                    message_thread_id: threadId
                }, {
                    filename: files[0].originalName
                });
            }
        } else if (files.length > 1) {
            // Check if all are images
            const allImages = files.every(f => {
                const ext = path.extname(f.path).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            });
            
            if (allImages) {
                const media = files.map((f, index) => ({
                    type: 'photo',
                    media: fs.createReadStream(f.path),
                    caption: index === 0 ? message : undefined,
                    parse_mode: index === 0 ? 'Markdown' : undefined,
                    fileOptions: {
                        filename: f.originalName
                    }
                }));
                const msgs = await bot.sendMediaGroup(finalChatId, media, {
                    message_thread_id: threadId
                });
                sentMsg = msgs[0];
            } else {
                // All as documents
                const media = files.map((f, index) => ({
                    type: 'document',
                    media: fs.createReadStream(f.path),
                    caption: index === 0 ? message : undefined,
                    parse_mode: index === 0 ? 'Markdown' : undefined,
                    fileOptions: {
                        filename: f.originalName
                    }
                }));
                const msgs = await bot.sendMediaGroup(finalChatId, media, {
                    message_thread_id: threadId
                });
                sentMsg = msgs[0];
            }
        } else {
            sentMsg = await bot.sendMessage(finalChatId, message, {
                parse_mode: 'Markdown',
                message_thread_id: threadId
            });
        }

        return { success: true, messageId: sentMsg.message_id };
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
