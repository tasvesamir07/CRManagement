const { createMessengerBot } = require("@dongdev/fca-unofficial");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../config/database");
const logger = require("../config/logger");

let isMockMode = false;
let botInstance = null;

// AppState (Facebook session cookies) is stored ENCRYPTED at rest. The backup
// file lives inside server/Fca_Database/ (gitignored). NEVER commit it.
const APPSTATE_PATH = path.join(__dirname, "../../Fca_Database/.appstate.enc");

// ------------- Encryption helpers (AES-256-GCM) -------------

function getEncryptionKey() {
    const raw = process.env.MESSENGER_APPSTATE_ENC_KEY || process.env.JWT_SECRET;
    if (!raw) {
        throw new Error("Messenger appState encryption key missing. Set MESSENGER_APPSTATE_ENC_KEY (or fall back to JWT_SECRET).");
    }
    return crypto.createHash("sha256").update(`messenger-appstate:v1:${raw}`).digest();
}

function encryptAppState(appState) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plain = Buffer.from(JSON.stringify(appState), "utf8");
    const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

function decryptAppState(data) {
    if (typeof data === "object") return data;
    if (typeof data !== "string") return null;
    if (!data.startsWith("enc:v1:")) {
        // Legacy plaintext JSON (pre-encryption) - accept but re-encrypt on next save
        try { return JSON.parse(data); } catch { return null; }
    }
    const parts = data.split(":");
    if (parts.length !== 5) return null;
    const [, , ivB64, tagB64, encB64] = parts;
    try {
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64"));
        const plain = Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]);
        return JSON.parse(plain.toString("utf8"));
    } catch (err) {
        logger.error({ err: err.message }, "Failed to decrypt stored appState (encryption key changed?)");
        return null;
    }
}

function readAppStateFile() {
    if (!fs.existsSync(APPSTATE_PATH)) return null;
    try {
        const raw = fs.readFileSync(APPSTATE_PATH, "utf8");
        const decrypted = decryptAppState(raw);
        if (decrypted) return decrypted;
    } catch (err) {
        logger.error({ err: err.message }, "Failed to read appState backup file");
    }
    return null;
}

function writeAppStateFile(appState) {
    try {
        fs.mkdirSync(path.dirname(APPSTATE_PATH), { recursive: true });
        fs.writeFileSync(APPSTATE_PATH, encryptAppState(appState), "utf8");
    } catch (fileErr) {
        logger.error({ err: fileErr }, "Failed to write appState backup file (non-fatal)");
    }
}

// ------------- AppState load/save -------------

async function loadAppState() {
    try {
        const res = await db.query("SELECT value FROM system_settings WHERE key = $1", ['messenger_appstate']);
        if (res.rows && res.rows.length > 0) {
            const parsed = decryptAppState(res.rows[0].value);
            if (parsed) return parsed;
            logger.warn("Stored appState could not be decrypted. Falling back to file backup.");
        }
    } catch (err) {
        logger.error({ err }, "Failed to load appState from DB");
    }
    const fromFile = readAppStateFile();
    if (fromFile) return fromFile;
    return null;
}

async function saveAppState(appState) {
    if (!appState) return;
    isMockMode = false;
    let encrypted;
    try {
        encrypted = encryptAppState(appState);
    } catch (err) {
        logger.error({ err: err.message }, "Failed to encrypt appState. Not persisting.");
        return;
    }
    try {
        await db.query(
            `INSERT INTO system_settings (key, value) 
             VALUES ($1, $2) 
             ON CONFLICT (key) 
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            ['messenger_appstate', encrypted]
        );
        logger.info("Messenger appState encrypted and persisted to database.");

        writeAppStateFile(appState);
    } catch (err) {
        logger.error({ err }, "Failed to save appState to DB");
    }
}

// ------------- Rate limiting (spread broadcasts to avoid FB flagging) -------------

let dailySendCount = 0;
let lastSendTime = 0;
setInterval(() => { dailySendCount = 0; }, 86400000).unref?.();

function getDailyCap() {
    const cap = parseInt(process.env.MESSENGER_DAILY_CAP || '400', 10);
    return Number.isFinite(cap) && cap > 0 ? cap : 400;
}

function getMinIntervalMs() {
    const ms = parseInt(process.env.MESSENGER_MIN_INTERVAL_MS || '1500', 10);
    return Number.isFinite(ms) && ms > 0 ? ms : 1500;
}

async function acquireSendSlot() {
    if (dailySendCount >= getDailyCap()) {
        throw new Error(`Messenger daily send cap (${getDailyCap()}) reached. Raise MESSENGER_DAILY_CAP or try again tomorrow.`);
    }
    dailySendCount++;
    const interval = getMinIntervalMs();
    const jitter = Math.floor(Math.random() * (interval * 0.5));
    const wait = Math.max(0, lastSendTime + interval + jitter - Date.now());
    lastSendTime = Date.now() + Math.max(0, wait);
    if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
    }
}

// ------------- Connection management -------------

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

function startWatchdog() {
    const intervalMs = parseInt(process.env.MESSENGER_WATCHDOG_MS || '120000', 10);
    const timer = setInterval(async () => {
        try {
            if (!botInstance) return;
            const connected = !!(botInstance.ctx && botInstance.ctx.mqttClient && botInstance.ctx.mqttClient.connected);
            if (!connected) {
                logger.warn('Messenger MQTT heartbeat lost. Re-initializing bot...');
                resetBot();
                await new Promise((resolve) => setTimeout(resolve, 2000));
                try {
                    await getBot();
                } catch (loginErr) {
                    logger.error({ err: loginErr.message }, 'Messenger watchdog re-login failed');
                }
            }
        } catch (err) {
            logger.error({ err }, 'Messenger watchdog error');
        }
    }, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
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
            logger.info('Facebook appstate backup file detected. Initializing...');
            appStateData = readAppStateFile();
            if (appStateData) {
                await saveAppState(appStateData);
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

            startWatchdog();
        } else {
            logger.warn('No Messenger appState found in DB/env/file. Running in Mock Mode.');
            isMockMode = true;
        }
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
                const fromFile = readAppStateFile();
                if (fromFile) {
                    appStateData = fromFile;
                } else if (process.env.MESSENGER_APPSTATE) {
                    appStateData = JSON.parse(process.env.MESSENGER_APPSTATE);
                }
            }

            if (!appStateData) {
                throw new Error("No appState credentials found to log in to Messenger.");
            }

            const instance = await createMessengerBot(
                { appState: appStateData },
                { listenEvents: true, autoListen: true, autoReconnect: true, online: false }
            );
            botInstance = instance;

            (async () => {
                let attempts = 0;
                while (attempts < 40) { // 40 * 500ms = 20s
                    const isConnected = !!(instance.ctx && instance.ctx.mqttClient && instance.ctx.mqttClient.connected);
                    if (isConnected) {
                        logger.info("Messenger MQTT client is fully connected and initialized.");
                        return;
                    }
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                logger.debug("Messenger MQTT background connection check completed.");
            })();

            try {
                const freshAppState = instance.api.getAppState();
                if (freshAppState) {
                    await saveAppState(freshAppState);
                }
            } catch (saveErr) {
                logger.error({ err: saveErr }, 'Failed to save refreshed appState on login');
            }

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

async function sendMessageToGroup(chatId, message, filePath = null, options = {}) {
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

    // Spread sends: jittered pacing + daily cap to avoid Facebook automation flags
    await acquireSendSlot();

    try {
        const bot = await getBot();

        // Ensure MQTT client is connected if available
        if (bot.ctx && bot.ctx.mqttClient && !bot.ctx.mqttClient.connected) {
            logger.info("Waiting for Messenger MQTT client connection before sending message...");
            let waitAttempts = 0;
            while (waitAttempts < 20 && bot.ctx.mqttClient && !bot.ctx.mqttClient.connected) {
                await new Promise(resolve => setTimeout(resolve, 500));
                waitAttempts++;
            }
        }

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

        // Query thread participants for @everyone / @all mentions
        let mentions = [];
        const hasMentionToken = message && /@(everyone|all)\b/i.test(message);
        if (options.mentionAll || hasMentionToken) {
            try {
                const threadInfo = await new Promise((resolve) => {
                    bot.api.getThreadInfo(chatId, (err, info) => {
                        if (err) {
                            logger.warn({ chatId, err: err.message || err }, 'Failed to get Messenger thread info for mentions');
                            resolve(null);
                        } else {
                            resolve(info);
                        }
                    });
                });

                if (threadInfo && Array.isArray(threadInfo.participantIDs) && threadInfo.participantIDs.length > 0) {
                    const myId = bot.api.getCurrentUserID?.();
                    const participantIDs = threadInfo.participantIDs.filter(id => String(id) !== String(myId));
                    const match = message ? message.match(/@(everyone|all)\b/i) : null;
                    const tag = match ? match[0] : '@everyone';
                    mentions = participantIDs.map(id => ({
                        tag,
                        id: String(id),
                        fromIndex: 0
                    }));
                    logger.info({ chatId, count: mentions.length, tag }, 'Attaching Messenger mentions for participants');
                }
            } catch (err) {
                logger.warn({ chatId, err: err.message }, 'Failed building Messenger mentions');
            }
        }

        let lastResult = null;
        let attachmentTuples = [];

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

                const unorderedTuples = uploadedIds.map(file => {
                    const key = Object.keys(file).find(k => k !== 'filename' && k !== 'filetype' && k !== 'thumbnail_src');
                    return [file.filename || 'file', String(file[key])];
                });

                attachmentTuples = [];
                const remainingTuples = [...unorderedTuples];
                for (const f of files) {
                    const index = remainingTuples.findIndex(t => t[0] === f.originalName);
                    if (index !== -1) {
                        attachmentTuples.push(remainingTuples[index]);
                        remainingTuples.splice(index, 1);
                    }
                }
                if (remainingTuples.length > 0) {
                    attachmentTuples.push(...remainingTuples);
                }
            }
        }

        if (message && message.trim()) {
            lastResult = await sendMsgPromise({
                body: message,
                ...(mentions.length > 0 ? { mentions } : {})
            });
        }
        if (attachmentTuples.length > 0) {
            logger.debug({ count: attachmentTuples.length, chatId }, 'Sending attachments sequentially');
            for (const tuple of attachmentTuples) {
                lastResult = await sendMsgPromise({ attachment: tuple });
            }
        }

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