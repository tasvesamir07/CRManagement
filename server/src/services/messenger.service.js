const { createMessengerBot } = require("@dongdev/fca-unofficial");
const fs = require("fs");
const path = require("path");

let isMockMode = false;
let botInstance = null;
let botReady = false;
let pendingSends = [];

const APPSTATE_PATH = path.join(__dirname, '../../../appstate.json');

function initMessenger() {
    const appStateEnv = process.env.MESSENGER_APPSTATE;
    if (appStateEnv) {
        console.log('Facebook MESSENGER_APPSTATE env variable detected. Initializing...');
        try {
            fs.writeFileSync(APPSTATE_PATH, appStateEnv, 'utf8');
        } catch (err) {
            console.error('Failed to write appstate.json from env:', err.message);
        }
    }

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
        console.log('⚠️ appstate.json not found in root/env. Messenger service will run in Mock Mode.');
        isMockMode = true;
    }
}

function resetBot() {
    botInstance = null;
    botReady = false;
}

async function getBot() {
    if (botInstance) return botInstance;

    const appStateData = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8'));
    botInstance = await createMessengerBot(
        { appState: appStateData },
        { listenEvents: false }
    );

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            resetBot();
            reject(new Error('Messenger bot login timed out after 30s'));
        }, 30000);

        botInstance.on("ready", () => {
            clearTimeout(timeout);
            botReady = true;
            resolve(botInstance);
        });

        botInstance.on("error", (err) => {
            clearTimeout(timeout);
            resetBot();
            reject(err);
        });
    });
}

async function sendMessageToGroup(chatId, message, filePath = null) {
    console.log(`Sending Messenger announcement to thread: ${chatId}`);

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

    try {
        const bot = await getBot();

        return new Promise((resolve, reject) => {
            const sendTimeout = setTimeout(() => {
                reject(new Error('Messenger send timed out after 30s'));
            }, 30000);

            const msgPayload = { body: message };

            if (files.length > 0 && fs.existsSync(files[0].path)) {
                msgPayload.attachment = fs.createReadStream(files[0].path);
            }

            bot.api.sendMessage(msgPayload, chatId, (err, messageInfo) => {
                clearTimeout(sendTimeout);
                if (err) {
                    console.error("FCA sendMessage failed:", err);
                    resetBot();
                    reject(err);
                } else {
                    resolve({ success: true, messageId: messageInfo?.messageID || 'fca-msg-id' });
                }
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
