const { createMessengerBot } = require("@dongdev/fca-unofficial");
const fs = require("fs");
const path = require("path");
const db = require("../config/database");

let isMockMode = false;
let botInstance = null;
let botReady = false;
let pendingSends = [];

const APPSTATE_PATH = path.join(__dirname, '../../../appstate.json');

async function loadAppState() {
    try {
        const res = await db.query("SELECT value FROM system_settings WHERE key = $1", ['messenger_appstate']);
        if (res.rows && res.rows.length > 0) {
            return JSON.parse(res.rows[0].value);
        }
    } catch (err) {
        console.error("Failed to load appState from DB:", err.message);
    }
    return null;
}

async function saveAppState(appState) {
    if (!appState) return;
    try {
        const serialized = JSON.stringify(appState);
        // Save to DB
        await db.query(
            `INSERT INTO system_settings (key, value) 
             VALUES ($1, $2) 
             ON CONFLICT (key) 
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            ['messenger_appstate', serialized]
        );
        console.log("✅ Messenger appState successfully persisted to database.");

        // Local file backup
        try {
            fs.writeFileSync(APPSTATE_PATH, serialized, 'utf8');
        } catch (fileErr) {
            // Ignore file write error
        }
    } catch (err) {
        console.error("Failed to save appState to DB:", err.message);
    }
}

async function initMessenger() {
    try {
        await db.waitForInit();
        let appStateData = await loadAppState();

        if (!appStateData) {
            const appStateEnv = process.env.MESSENGER_APPSTATE;
            if (appStateEnv) {
                console.log('Facebook MESSENGER_APPSTATE env variable detected. Initializing...');
                try {
                    appStateData = JSON.parse(appStateEnv);
                    await saveAppState(appStateData);
                } catch (err) {
                    console.error('Failed to parse appState from env:', err.message);
                }
            }
        }

        if (!appStateData && fs.existsSync(APPSTATE_PATH)) {
            console.log('Facebook appstate.json file detected. Initializing...');
            try {
                appStateData = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8'));
                await saveAppState(appStateData);
            } catch (err) {
                console.error('Failed to parse appstate.json file:', err.message);
            }
        }

        if (appStateData) {
            isMockMode = false;
            console.log('✅ Messenger Bot service is ready for broadcasting.');
        } else {
            console.log('⚠️ No Messenger appState found in DB/env/file. Messenger service will run in Mock Mode.');
            isMockMode = true;
        }
    } catch (err) {
        console.error('⚠️ Failed to initialize Messenger. Running in Mock Mode.', err.message);
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
            await db.waitForInit();
            let appStateData = await loadAppState();

            if (!appStateData) {
                // Fallback to local file or env
                if (fs.existsSync(APPSTATE_PATH)) {
                    appStateData = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8'));
                } else if (process.env.MESSENGER_APPSTATE) {
                    appStateData = JSON.parse(process.env.MESSENGER_APPSTATE);
                }
            }

            if (!appStateData) {
                throw new Error("No appState credentials found to log in to Messenger.");
            }

            const instance = await createMessengerBot(
                { appState: appStateData },
                { listenEvents: false, autoListen: true, autoReconnect: true, online: false }
            );
            botInstance = instance;
            botReady = true;

            // Save fresh login appState (may contain refreshed/new cookies)
            try {
                const freshAppState = instance.api.getAppState();
                if (freshAppState) {
                    await saveAppState(freshAppState);
                }
            } catch (saveErr) {
                console.error("Failed to save refreshed appState on login:", saveErr.message);
            }

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

        let lastResult = null;

        // 1. Send the text message body if present
        if (message && message.trim()) {
            lastResult = await sendMsgPromise({ body: message });
        }

        // 2. Send the files/attachments separately (required due to Facebook Messenger API limitations)
        if (files.length > 0) {
            const streams = [];
            for (const f of files) {
                if (fs.existsSync(f.path)) {
                    streams.push(fs.createReadStream(f.path));
                }
            }
            if (streams.length > 0) {
                const attachPayload = {
                    body: "",
                    attachment: streams.length === 1 ? streams[0] : streams
                };
                lastResult = await sendMsgPromise(attachPayload);
            }
        }

        // 3. Save refreshed appState to persistent storage
        try {
            const freshAppState = bot.api.getAppState();
            if (freshAppState) {
                await saveAppState(freshAppState);
            }
        } catch (saveErr) {
            console.error("Failed to save rotated appState after broadcast:", saveErr.message);
        }

        return { success: true, messageId: lastResult?.messageID || 'fca-msg-id' };
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
