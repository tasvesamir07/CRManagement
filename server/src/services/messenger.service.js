const { createMessengerBot } = require("@dongdev/fca-unofficial");
const fs = require("fs");
const path = require("path");

let isMockMode = false;

const APPSTATE_PATH = path.join(__dirname, '../../../appstate.json');

function initMessenger() {
    if (fs.existsSync(APPSTATE_PATH)) {
        console.log('Facebook appstate.json detected. Initializing Messenger bot...');
        try {
            isMockMode = false;
            console.log('✅ Messenger Bot service is ready for broadcasting.');
        } catch (err) {
            console.error('⚠️ Failed to verify appstate.json. Running in Mock Mode.', err.message);
            isMockMode = true;
        }
    } else {
        console.log('⚠️ appstate.json not found in root. Messenger service will run in Mock Mode.');
        isMockMode = true;
    }
}

async function sendMessageToGroup(chatId, message, filePath = null) {
    console.log(`Sending Messenger announcement to thread: ${chatId}`);

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

    if (isMockMode) {
        console.log(`[MOCK MESSENGER] Sending message to ${chatId}:`);
        console.log(message);
        files.forEach((f, index) => {
            console.log(`[MOCK MESSENGER] Attachment path ${index + 1}: ${f.path} (Original Name: ${f.originalName})`);
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, messageId: `mock-msg-id-${Date.now()}` };
    }

    // Load appState and send message
    try {
        const appStateData = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8'));
        const bot = await createMessengerBot(
            { appState: appStateData },
            { listenEvents: false }
        );

        return new Promise((resolve, reject) => {
            bot.on("ready", async () => {
                try {
                    // Send message (and attachments if present)
                    const msgPayload = {
                        body: message
                    };

                    if (files.length > 0 && fs.existsSync(files[0].path)) {
                        msgPayload.attachment = fs.createReadStream(files[0].path);
                    }

                    // Send it
                    bot.api.sendMessage(msgPayload, chatId, (err, messageInfo) => {
                        if (err) {
                            console.error("FCA sendMessage failed:", err);
                            reject(err);
                        } else {
                            resolve({ success: true, messageId: messageInfo?.messageID || 'fca-msg-id' });
                        }
                    });
                } catch (sendErr) {
                    reject(sendErr);
                }
            });

            bot.on("error", (err) => {
                console.error("FCA bot error:", err);
                reject(err);
            });
        });
    } catch (err) {
        console.error(`Error sending Messenger message to ${chatId}:`, err.message);
        throw err;
    }
}

module.exports = {
    initMessenger,
    sendMessageToGroup,
    isMock: () => isMockMode
};
