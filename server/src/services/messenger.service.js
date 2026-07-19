const { createMessengerBot } = require("@dongdev/fca-unofficial");
const fs = require("fs");
const path = require("path");
const db = require("../config/database");
const logger = require("../config/logger");

let isMockMode = false;
let botInstance = null;


const APPSTATE_PATH = path.join(__dirname, '../../../appstate.json');

async function loadAppState() {
    try {
        const res = await db.query("SELECT value FROM system_settings WHERE key = $1", ['messenger_appstate']);
        if (res.rows && res.rows.length > 0) {
            return JSON.parse(res.rows[0].value);
        }
    } catch (err) {
        logger.error({ err }, "Failed to load appState from DB");
    }
    return null;
}

async function saveAppState(appState) {
    if (!appState) return;
    isMockMode = false;
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
        logger.info("Messenger appState successfully persisted to database.");

        // Local file backup
        try {
            fs.writeFileSync(APPSTATE_PATH, serialized, 'utf8');
        } catch (fileErr) {
            // Ignore file write error
        }
    } catch (err) {
        logger.error({ err }, "Failed to save appState to DB");
    }
}
async function checkConnection() {
    try {
        logger.info("Running proactive Messenger connection check...");
        const appStateData = await loadAppState();
        const hasAppState = appStateData || process.env.MESSENGER_APPSTATE || fs.existsSync(APPSTATE_PATH);
        if (!hasAppState) {
            logger.info("No Messenger appstate found. Staying in Mock Mode.");
            resetBot();
            isMockMode = true;
            return false;
        }

        const bot = await getBot();
        
        const isMqttConnected = !!(bot.ctx && bot.ctx.mqttClient && bot.ctx.mqttClient.connected);
        logger.info({ isMqttConnected }, 'Messenger connection check info');

        const myId = bot.api.getCurrentUserID();
        if (!myId) {
            throw new Error("No user ID returned from Messenger API");
        }

        await new Promise((resolve, reject) => {
            bot.api.getUserInfo([myId], (err, info) => {
                if (err) reject(err);
                else resolve(info);
            });
        });

        logger.info({ userId: myId }, 'Messenger connection check passed');
        isMockMode = false;
        return true;
    } catch (err) {
        logger.warn({ err: err.message }, 'Messenger connection check failed. Transitioning to Mock Mode.');
        resetBot();
        isMockMode = true;
        return false;
    }
}

async function initMessenger() {
    try {
        await db.waitForInit();
        let appStateData = await loadAppState();

        if (!appStateData) {
            const appStateEnv = process.env.MESSENGER_APPSTATE;
            if (appStateEnv) {
                logger.info('Facebook MESSENGER_APPSTATE env variable detected. Initializing...');
                try {
                    appStateData = JSON.parse(appStateEnv);
                    await saveAppState(appStateData);
                } catch (err) {
                    logger.error({ err }, 'Failed to parse appState from env');
                }
            }
        }

        if (!appStateData && fs.existsSync(APPSTATE_PATH)) {
            logger.info('Facebook appstate.json file detected. Initializing...');
            try {
                appStateData = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8'));
                await saveAppState(appStateData);
            } catch (err) {
                logger.error({ err }, 'Failed to parse appstate.json file');
            }
        }

        if (appStateData) {
            isMockMode = false;
            logger.info('Messenger Bot service is ready for broadcasting.');
            
            setTimeout(async () => {
                try {
                    await checkConnection();
                } catch (err) {
                    logger.error({ err }, 'Initial Messenger connection check failed');
                }
            }, 5000);
        } else {
            logger.warn('No Messenger appState found in DB/env/file. Running in Mock Mode.');
            isMockMode = true;
        }

        setInterval(async () => {
            try {
                await checkConnection();
            } catch (err) {
                logger.error({ err }, 'Scheduled Messenger connection check error');
            }
        }, 6 * 60 * 60 * 1000);
    } catch (err) {
        logger.error({ err }, 'Failed to initialize Messenger. Running in Mock Mode.');
        isMockMode = true;
    }
}

let loginPromise = null;

function resetBot() {
    if (botInstance) {
        const oldBot = botInstance;
        try {
            if (oldBot._mqtt) {
                if (typeof oldBot._mqtt.stopListening === 'function') {
                    oldBot._mqtt.stopListening();
                }
                oldBot._mqtt.removeAllListeners?.();
            }
            oldBot.detachStopSignals?.();
        } catch (err) {
            logger.error({ err }, 'Error stopping Messenger bot manually during reset');
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

            // Check MQTT client connection in background (non-blocking)
            (async () => {
                let attempts = 0;
                while (attempts < 20) { // 20 * 500ms = 10s
                    const isConnected = !!(instance.ctx && instance.ctx.mqttClient && instance.ctx.mqttClient.connected);
                    if (isConnected) {
                        logger.info("Messenger MQTT client is fully connected and initialized.");
                        return;
                    }
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                logger.warn("Messenger MQTT client failed to connect in background within timeout. Messages may still work via HTTP.");
            })();

            // Save fresh login appState (may contain refreshed/new cookies)
            try {
                const freshAppState = instance.api.getAppState();
                if (freshAppState) {
                    await saveAppState(freshAppState);
                }
            } catch (saveErr) {
                logger.error({ err: saveErr }, 'Failed to save refreshed appState on login');
            }

            // Attach runtime error listener to reset on connection drop
            instance.on("error", (err) => {
                logger.error({ err }, 'Messenger bot runtime error');
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
    logger.info({ chatId }, 'Sending Messenger announcement to thread');

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
        if (process.env.NODE_ENV === 'test') {
            logger.debug({ chatId }, 'Mock Messenger send');

            return { success: true, messageId: `mock-msg-id-${Date.now()}` };
        }
        throw new Error('Messenger service is currently disconnected or running in Mock Mode. Please check your appstate connection.');
    }

    try {
        const bot = await getBot();

        // Helper to send a single message with promise wrapper
        const sendMsgPromise = (payload) => {
            return new Promise((resolve, reject) => {
                logger.debug({ chatId, payload: JSON.stringify(payload) }, 'FCA sendMessage called');
                bot.api.sendMessage(payload, chatId, (err, messageInfo) => {
                    if (err) {
                        logger.error({ chatId, err }, 'FCA sendMessage failed');
                        const errMsg = err.message || err.error || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Unknown FCA error';
                        reject(new Error(errMsg));
                    } else {
                        logger.debug({ chatId, messageInfo: JSON.stringify(messageInfo) }, 'FCA sendMessage succeeded');
                        resolve(messageInfo);
                    }
                });
            });
        };

        let lastResult = null;
        let attachmentTuples = [];

        // 1. Upload files first to get the FBIDs with correct extensions
        if (files.length > 0) {
            const uploadInputs = [];
            for (const f of files) {
                if (fs.existsSync(f.path)) {
                    uploadInputs.push({
                        path: f.path,
                        filename: f.originalName
                    });
                }
            }
            if (uploadInputs.length > 0) {
                logger.info({ count: uploadInputs.length }, 'Uploading attachments to Facebook...');
                const uploadedIds = await bot.api.uploadAttachment(uploadInputs);
                logger.debug({ uploadedIds }, 'Successfully uploaded attachments');

                // Map results to [filename, fbid] tuples
                const unorderedTuples = uploadedIds.map(file => {
                    const key = Object.keys(file).find(k => k !== 'filename' && k !== 'filetype' && k !== 'thumbnail_src');
                    return [file.filename || 'file', String(file[key])];
                });

                // Reorder attachmentTuples to match the exact order of the original files array (handling potential duplicates)
                attachmentTuples = [];
                const remainingTuples = [...unorderedTuples];
                for (const f of files) {
                    const index = remainingTuples.findIndex(t => t[0] === f.originalName);
                    if (index !== -1) {
                        attachmentTuples.push(remainingTuples[index]);
                        remainingTuples.splice(index, 1);
                    }
                }
                // Append any remaining/fallback tuples that couldn't be matched by name
                if (remainingTuples.length > 0) {
                    attachmentTuples.push(...remainingTuples);
                }
            }
        }

        // 2. Send text and attachments separately: text first, then files in parallel
        if (message && message.trim()) {
            lastResult = await sendMsgPromise({ body: message });
        }
        if (attachmentTuples.length > 0) {
            logger.debug({ count: attachmentTuples.length, chatId }, 'Sending attachments sequentially');
            for (const tuple of attachmentTuples) {
                lastResult = await sendMsgPromise({ attachment: tuple });
            }
        }

        // 3. Save refreshed appState to persistent storage
        try {
            const freshAppState = bot.api.getAppState();
            if (freshAppState) {
                await saveAppState(freshAppState);
            }
        } catch (saveErr) {
            logger.error({ err: saveErr }, 'Failed to save rotated appState after broadcast');
        }

        return { success: true, messageId: lastResult?.messageID || 'fca-msg-id' };
    } catch (err) {
        logger.error({ chatId, err }, 'Error sending Messenger message');
        resetBot();
        throw err;
    }
}

module.exports = {
    initMessenger,
    sendMessageToGroup,
    saveAppState,
    resetBot,
    checkConnection,
    isMock: () => isMockMode
};
