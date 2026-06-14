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

let loginPromise = null;

function resetBot() {
    if (botInstance) {
        const oldBot = botInstance;
        if (typeof oldBot.stop === 'function') {
            oldBot.stop().catch(err => console.error("Error stopping Messenger bot during reset:", err.message));
        }
    }
    botInstance = null;
    botReady = false;
    loginPromise = null;
}

async function getBot() {
    if (botInstance) return botInstance;
    if (loginPromise) return loginPromise;

    loginPromise = (async () => {
        try {
            const appStateData = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8'));
            const instance = await createMessengerBot(
                { appState: appStateData },
                { listenEvents: false, autoListen: false, autoReconnect: false, online: false }
            );
            botInstance = instance;
            botReady = true;

            // Attach runtime error listener to reset on connection drop
            instance.on("error", (err) => {
                console.error("Messenger bot runtime error:", err.message);
                resetBot();
            });

            return instance;
        } catch (err) {
            loginPromise = null;
            throw err;
        }
    })();

    return loginPromise;
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

        const msgPayload = { body: message };
        if (files.length > 0) {
            const streams = [];
            for (const f of files) {
                if (fs.existsSync(f.path)) {
                    streams.push(fs.createReadStream(f.path));
                }
            }
            if (streams.length > 0) {
                msgPayload.attachment = streams.length === 1 ? streams[0] : streams;
            }
        }

        // Helper to send a single message with promise wrapper
        const sendMsgPromise = (payload) => {
            return new Promise((resolve, reject) => {
                bot.api.sendMessage(payload, chatId, (err, messageInfo) => {
                    if (err) {
                        const errMsg = err.message || err.error || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Unknown FCA error';
                        reject(new Error(errMsg));
                    } else {
                        resolve(messageInfo);
                    }
                });
            });
        };

        const result = await sendMsgPromise(msgPayload);
        return { success: true, messageId: result?.messageID || 'fca-msg-id' };
    } catch (err) {
        console.error(`Error sending Messenger message to ${chatId}:`, err.message);
        resetBot();
        throw err;
    }
}

module.exports = {
    initMessenger,
    sendMessageToGroup,
    isMock: () => isMockMode
};
