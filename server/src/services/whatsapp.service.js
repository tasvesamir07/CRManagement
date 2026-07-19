const fs = require('fs');
const path = require('path');
const pino = require('pino');
const appLogger = require('../config/logger');

const isVercel = !!process.env.VERCEL;
const RELAY_URL = process.env.WHATSAPP_RELAY_URL;
const RELAY_SECRET = process.env.WHATSAPP_RELAY_SECRET;
const isRelayMode = !!RELAY_URL;

let connectionStatus = 'DISCONNECTED';
let latestQr = '';
let wsBroadcaster = null;
let isMockMode = isVercel;
let hasEverBeenConnected = false;
const relayPollTimer = null;

function setWsBroadcaster(broadcaster) {
    wsBroadcaster = broadcaster;
}

function broadcastStatus() {
    if (wsBroadcaster) {
        wsBroadcaster({
            type: 'whatsapp_status',
            data: { status: connectionStatus, qr: latestQr, isMock: isMockMode }
        });
    }
}

// ---- RELAY MODE (proxy through external VPS) ----
if (isRelayMode) {
    const relayFetch = async (path, options = {}) => {
        const url = `${RELAY_URL}${path}`;
        const headers = { 'x-relay-secret': RELAY_SECRET, ...options.headers };
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Relay ${res.status}: ${body}`);
        }
        return res.json();
    };

    const pollRelayStatus = async () => {
        if (isMockMode) return;
        try {
            const data = await relayFetch('/status');
            connectionStatus = data.status;
            if (data.qr) latestQr = data.qr;
            else if (connectionStatus !== 'QR_READY') latestQr = '';
            broadcastStatus();
        } catch (err) {
            appLogger.error({ err: err.message }, 'Relay status poll failed');
            connectionStatus = 'DISCONNECTED';
            broadcastStatus();
        }
    };

    const initWhatsApp = async () => {
        if (isMockMode) return;
        appLogger.info({ relayUrl: RELAY_URL }, 'Using remote relay');
        isMockMode = false;
        connectionStatus = 'CONNECTING';
        broadcastStatus();
        pollRelayTimer = setInterval(pollRelayStatus, 3000);
        setTimeout(pollRelayStatus, 1000);
    };

    const requestPairingCode = async (phoneNumber) => {
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (!cleanPhone) throw new Error('Invalid phone number');
        const data = await relayFetch('/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone })
        });
        return { code: data.code };
    };

    const sendMessageToGroup = async (chatId, message, filePath = null) => {
        if (isMockMode) {
            appLogger.debug({ chatId }, 'Mock WhatsApp send (relay)');
            return { success: true, messageId: 'mock_msg_id' };
        }
        const rawFiles = filePath ? (Array.isArray(filePath) ? filePath : [filePath]) : [];
        const fileReads = rawFiles.map(async (f) => {
            const fp = typeof f === 'string' ? f : f.path;
            if (fs.existsSync(fp)) {
                const data = await fs.promises.readFile(fp, { encoding: 'base64' });
                const ext = path.extname(fp).toLowerCase();
                const mimetype = ext === '.png' ? 'image/png'
                    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                    : ext === '.gif' ? 'image/gif'
                    : ext === '.pdf' ? 'application/pdf'
                    : ext === '.mp4' ? 'video/mp4'
                    : 'application/octet-stream';
                return { data, mimetype, name: path.basename(fp) };
            }
            return null;
        });
        const files = (await Promise.all(fileReads)).filter(Boolean);
        const data = await relayFetch('/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message, files })
        });
        return data;
    };

    const getChats = async () => {
        try {
            const data = await relayFetch('/groups');
            return data.groups;
        } catch {
            return [
                { id: '12036329481920@g.us', name: 'General Community', isGroup: true },
                { id: '12036329483344@g.us', name: 'Announcement Community', isGroup: true }
            ];
        }
    };

    const restartWhatsApp = async () => {
        await relayFetch('/restart', { method: 'POST' });
    };

    const clearSession = async () => {
        await relayFetch('/clear-session', { method: 'POST' });
    };

    const destroyWhatsApp = async () => {
        if (relayPollTimer) clearInterval(relayPollTimer);
    };

    module.exports = {
        initWhatsApp,
        sendMessageToGroup,
        getChats,
        getStatus: () => ({ status: connectionStatus, qr: latestQr, isMock: isMockMode }),
        isMock: () => isMockMode,
        setWsBroadcaster,
        restartWhatsApp,
        clearSession,
        destroyWhatsApp,
        requestPairingCode
    };

// ---- DIRECT BAILEYS MODE (existing implementation) ----
} else {
    let makeWASocket, DisconnectReason, Browsers;
    if (!isVercel) {
        try {
            const baileys = require('@whiskeysockets/baileys');
            makeWASocket = baileys.makeWASocket;
            DisconnectReason = baileys.DisconnectReason;
            Browsers = baileys.Browsers;
        } catch (err) {
            appLogger.error({ err: err.message }, 'Failed to load @whiskeysockets/baileys');
        }
    }

    let sock = null;
    let globalKeysFlush = null;
    let _consecutive401Count = 0;
    let reconnectTimer = null;
    const pairingResolve = null;

    const AUTH_FOLDER = path.join(__dirname, '../../../.baileys_auth');

    const logger = pino({ level: 'silent' });

    async function useDbAuthState() {
        const { useMultiFileAuthState, initAuthCreds } = require('@whiskeysockets/baileys');
        const db = require('../config/database');
        const isPostgres = !!process.env.DATABASE_URL && !db.useJsonDb();
        let credsData = null;
        let keysStore = {};

        function reviveBuffers(obj) {
            if (obj === null || obj === undefined) return obj;
            if (Array.isArray(obj)) return obj.map(reviveBuffers);
            if (typeof obj === 'object' && obj.type === 'Buffer' && Array.isArray(obj.data)) {
                return Buffer.from(obj.data);
            }
            if (typeof obj === 'object') {
                const result = {};
                for (const key in obj) {
                    result[key] = reviveBuffers(obj[key]);
                }
                return result;
            }
            return obj;
        }

        if (isPostgres) {
            try {
                await db.query(`CREATE TABLE IF NOT EXISTS whatsapp_creds (type TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`);
                const cr = await db.query("SELECT data FROM whatsapp_creds WHERE type = 'creds'");
                if (cr.rows[0]) credsData = reviveBuffers(cr.rows[0].data);
                const kr = await db.query("SELECT data FROM whatsapp_creds WHERE type = 'keys'");
                if (kr.rows[0]) keysStore = reviveBuffers(kr.rows[0].data) || {};
            } catch (err) {
                appLogger.error({ err: err.message }, 'DB auth init failed, using file fallback');
                return useMultiFileAuthState(AUTH_FOLDER);
            }
        } else {
            return useMultiFileAuthState(AUTH_FOLDER);
        }

        if (!credsData) credsData = initAuthCreds();

        let lastSaveTime = 0;
        let saveKeysTimeout = null;

        const scheduleKeysSave = () => {
            const now = Date.now();
            const timeSinceLastSave = now - lastSaveTime;
            const throttleLimit = 30000; // 30 seconds throttle

            if (saveKeysTimeout) clearTimeout(saveKeysTimeout);

            const performSave = async () => {
                saveKeysTimeout = null;
                lastSaveTime = Date.now();
                try {
                    await db.query(
                        `INSERT INTO whatsapp_creds (type, data, updated_at) 
                         VALUES ('keys', $1::jsonb, NOW()) 
                         ON CONFLICT (type) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
                        [JSON.stringify(keysStore)]
                    );
                } catch (err) {
                    appLogger.error({ err: err.message }, 'Failed to save keys to DB');
                }
            };

            if (timeSinceLastSave >= throttleLimit) {
                performSave();
            } else {
                saveKeysTimeout = setTimeout(performSave, throttleLimit - timeSinceLastSave);
            }
        };

        globalKeysFlush = async () => {
            if (saveKeysTimeout) {
                clearTimeout(saveKeysTimeout);
                saveKeysTimeout = null;
            }
            try {
                await db.query(
                    `INSERT INTO whatsapp_creds (type, data, updated_at) 
                     VALUES ('keys', $1::jsonb, NOW()) 
                     ON CONFLICT (type) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
                    [JSON.stringify(keysStore)]
                );
                appLogger.info('Flushed final keys to DB successfully.');
            } catch (err) {
                appLogger.error({ err: err.message }, 'Failed to flush final keys');
            }
        };

        const keys = {
            get: async (type, ids) => {
                const data = keysStore[type] || {};
                if (!ids) return data;
                const r = {};
                for (const id of ids) if (data[id] !== undefined) r[id] = data[id];
                return r;
            },
            set: async (data) => {
                let changed = false;
                for (const type in data) {
                    if (!keysStore[type]) keysStore[type] = {};
                    for (const id in data[type]) {
                        if (JSON.stringify(keysStore[type][id]) !== JSON.stringify(data[type][id])) {
                            keysStore[type][id] = data[type][id];
                            changed = true;
                        }
                    }
                }
                if (changed) {
                    scheduleKeysSave();
                }
            },
            delete: async () => {}
        };

        const saveCreds = async () => {
            await db.query(`INSERT INTO whatsapp_creds (type, data, updated_at) VALUES ('creds', $1::jsonb, NOW()) ON CONFLICT (type) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [JSON.stringify(credsData)]);
        };

        return { state: { creds: credsData, keys }, saveCreds };
    }

    async function initWhatsApp() {
        if (isMockMode) {
            appLogger.warn('WhatsApp service running in Mock Mode. Skipping initialization.');
            connectionStatus = 'DISCONNECTED';
            broadcastStatus();
            return;
        }

        if (sock) {
            appLogger.info('WhatsApp client already initialized.');
            return;
        }

        appLogger.info('Initializing WhatsApp Client (Baileys)...');
        connectionStatus = 'CONNECTING';
        broadcastStatus();

        try {
            const { state, saveCreds } = await useDbAuthState();

            const socketConfig = {
                auth: state,
                logger,
                printQRInTerminal: false,
                markOnlineOnConnect: true,
                syncFullHistory: false,
                browser: Browsers ? Browsers.ubuntu('Chrome') : ['Chrome (Linux)', '', ''],
                generateHighQualityLinkPreview: false,
                keepAliveIntervalMs: 15000,
                connectTimeoutMs: 60000
            };

            const proxyUrl = process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
            if (proxyUrl) {
                appLogger.info('Using proxy for WhatsApp connection');
                try {
                    const { HttpsProxyAgent } = require('https-proxy-agent');
                    socketConfig.agent = new HttpsProxyAgent(proxyUrl);
                } catch (err) {
                    appLogger.error({ err: err.message }, 'Failed to initialize HttpsProxyAgent');
                }
            }

            sock = makeWASocket(socketConfig);

            sock.ev.on('creds.update', (update) => {
                const wasQrReady = connectionStatus === 'QR_READY';
                saveCreds(update);
                if (wasQrReady) {
                    appLogger.info('WhatsApp QR scanned, authenticating...');
                    connectionStatus = 'CONNECTING';
                    broadcastStatus();
                }
            });

            sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    appLogger.info('WhatsApp QR emitted (new code ready for scanning)');
                    latestQr = qr;
                    connectionStatus = 'QR_READY';
                    broadcastStatus();
                }

                if (connection === 'connecting') {
                    appLogger.info('WhatsApp client is connecting...');
                    connectionStatus = 'CONNECTING';
                    broadcastStatus();
                }

                if (connection === 'open') {
                    appLogger.info('WhatsApp client is ready and connected!');
                    connectionStatus = 'CONNECTED';
                    latestQr = '';
                    hasEverBeenConnected = true;
                    broadcastStatus();
                    if (pairingResolve) {
                        pairingResolve({ code: '' });
                    }
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const errMsg = lastDisconnect?.error?.message || lastDisconnect?.error?.toString() || 'unknown';
                    connectionStatus = 'DISCONNECTED';
                    latestQr = '';
                    broadcastStatus();

                    sock = null;

                    if (statusCode === DisconnectReason.loggedOut) {
                        _consecutive401Count++;
                        appLogger.error({ err: errMsg }, 'WhatsApp connection error');
                        appLogger.warn({ reason: statusCode, wasConnected: hasEverBeenConnected, consecutive401: _consecutive401Count }, 'WhatsApp disconnected');
                        
                        try {
                            const db = require('../config/database');
                            if (process.env.DATABASE_URL && !db.useJsonDb()) {
                                db.query("DELETE FROM whatsapp_creds").catch(e => appLogger.error({ err: e }, 'Failed to delete creds on logout'));
                            }
                            if (fs.existsSync(AUTH_FOLDER)) {
                                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                            }
                        } catch (e) {
                            appLogger.error({ err: e.message }, 'Failed to clean up credentials on logout');
                        }

                        if (_consecutive401Count >= 5) {
                            appLogger.warn('Too many consecutive 401 failures. Falling back to mock mode.');
                            isMockMode = true;
                            return;
                        }
                    } else {
                        _consecutive401Count = 0;
                    }

                    if (!isMockMode) {
                        let delay = 10000;
                        if (statusCode === 408) delay = 10000;
                        appLogger.info({ delaySeconds: delay / 1000 }, 'Reconnecting...');
                        clearTimeout(reconnectTimer);
                        reconnectTimer = setTimeout(initWhatsApp, delay);
                    }
                }
            });

            sock.ev.on('messages.upsert', () => {});
        } catch (err) {
            appLogger.error({ err: err.message }, 'Failed to initialize WhatsApp client. Running in Mock Mode.');
            isMockMode = true;
            connectionStatus = 'DISCONNECTED';
            broadcastStatus();
            sock = null;
        }
    }

    async function requestPairingCode(phoneNumber) {
        if (isMockMode) {
            throw new Error('WhatsApp engine is in mock mode. The WhatsApp service failed to initialize and cannot pair. Check server logs for details.');
        }

        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (!cleanPhone) {
            throw new Error('Invalid phone number format. Please provide a valid phone number.');
        }

        if (connectionStatus === 'CONNECTED') {
            throw new Error('WhatsApp is already connected. No pairing needed.');
        }

        if (!sock) {
            clearTimeout(reconnectTimer);
            await initWhatsApp();
            if (isMockMode) {
                throw new Error('WhatsApp engine failed to initialize. Check server logs for details.');
            }
            if (!sock) {
                throw new Error('WhatsApp client failed to initialize. Please try again.');
            }
        }

        for (let i = 0; i < 45; i++) {
            if (connectionStatus === 'QR_READY' || connectionStatus === 'CONNECTED') break;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (connectionStatus !== 'QR_READY' && connectionStatus !== 'CONNECTED') {
            throw new Error(`WhatsApp connection not ready (status: ${connectionStatus}). Please wait for QR code and try again.`);
        }

        appLogger.info({ phone: cleanPhone.replace(/\d(?=\d{4})/g, '*') }, 'Waiting for socket stabilization before requesting pairing code');
        await new Promise(r => setTimeout(r, 3000));

        try {
            const code = await sock.requestPairingCode(cleanPhone);
            const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
            return { code: formattedCode };
        } catch (err) {
            appLogger.error({ err: err.message }, 'Pairing code request failed');
            throw new Error('Failed to request pairing code: ' + err.message);
        }
    }

    async function sendMessageToGroup(chatId, message, filePath = null) {
        appLogger.info({ chatId }, 'Sending WhatsApp message to group');

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
            appLogger.debug({ chatId }, 'Mock WhatsApp send');
            return { success: true, messageId: 'mock_msg_id' };
        }

        if (connectionStatus !== 'CONNECTED' || !sock) {
            throw new Error('WhatsApp client is not connected. Please scan the QR code or use phone pairing to link your device first.');
        }

        try {
            let targetId = chatId;
            if (!chatId.includes('@')) {
                targetId = `${chatId}@g.us`;
            }

            let sentMsg;
            if (files.length > 0 && fs.existsSync(files[0].path)) {
                const data = fs.readFileSync(files[0].path);
                const ext = path.extname(files[0].path).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png'
                    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                    : ext === '.gif' ? 'image/gif'
                    : ext === '.pdf' ? 'application/pdf'
                    : ext === '.doc' || ext === '.docx' ? 'application/msword'
                    : ext === '.mp4' ? 'video/mp4'
                    : 'application/octet-stream';

                if (mimeType.startsWith('image/')) {
                    sentMsg = await sock.sendMessage(targetId, {
                        image: data,
                        caption: message
                    });
                } else if (mimeType.startsWith('video/')) {
                    sentMsg = await sock.sendMessage(targetId, {
                        video: data,
                        caption: message
                    });
                } else {
                    sentMsg = await sock.sendMessage(targetId, {
                        document: data,
                        mimetype: mimeType,
                        fileName: files[0].originalName,
                        caption: message
                    });
                }

                // Send remaining files in parallel (user chose speed over order)
                const remainderSends = files.slice(1).map(async (fi) => {
                    if (!fs.existsSync(fi.path)) return;
                    const extraData = fs.readFileSync(fi.path);
                    const extraExt = path.extname(fi.path).toLowerCase();
                    const extraMime = extraExt === '.png' ? 'image/png'
                        : extraExt === '.jpg' || extraExt === '.jpeg' ? 'image/jpeg'
                        : extraExt === '.gif' ? 'image/gif'
                        : extraExt === '.pdf' ? 'application/pdf'
                        : extraExt === '.doc' || extraExt === '.docx' ? 'application/msword'
                        : extraExt === '.mp4' ? 'video/mp4'
                        : 'application/octet-stream';
                    try {
                        if (extraMime.startsWith('image/')) {
                            await sock.sendMessage(targetId, { image: extraData });
                        } else if (extraMime.startsWith('video/')) {
                            await sock.sendMessage(targetId, { video: extraData });
                        } else {
                            await sock.sendMessage(targetId, { document: extraData, mimetype: extraMime, fileName: fi.originalName });
                        }
                    } catch (err) {
                        appLogger.error({ filePath: fi.path, err: err.message }, 'Failed to send extra file to WhatsApp');
                    }
                });
                await Promise.all(remainderSends);
            } else {
                sentMsg = await sock.sendMessage(targetId, { text: message });
            }

            const msgId = sentMsg?.key?.id || 'unknown';
            return { success: true, messageId: msgId };
        } catch (err) {
            appLogger.error({ chatId, err: err.message }, 'Error sending WhatsApp message');
            throw err;
        }
    }

    async function getChats() {
        if (isMockMode || connectionStatus !== 'CONNECTED' || !sock) {
            return [
                { id: '12036329481920@g.us', name: 'General Community', isGroup: true },
                { id: '12036329483344@g.us', name: 'Announcement Community', isGroup: true }
            ];
        }

        try {
            const chats = await sock.groupFetchAllParticipating();
            const chatValues = Object.values(chats);

            const communityNames = {};
            for (const chat of chatValues) {
                if (chat.isCommunity) {
                    communityNames[chat.id] = chat.subject || chat.id;
                }
            }

            const groups = chatValues
                .filter(group => !group.isCommunity)
                .map(group => {
                    let name = group.subject || group.id;
                    if (group.isCommunityAnnounce) {
                        const parentName = communityNames[group.linkedParent] || 'Community';
                        name = `${parentName} Announcements`;
                    }
                    return {
                        id: group.id,
                        name: name,
                        isGroup: true
                    };
                });

            return groups;
        } catch (err) {
            appLogger.error({ err: err.message }, 'Error fetching WhatsApp chats');
            return [];
        }
    }

    async function restartWhatsApp() {
        appLogger.info('Restarting WhatsApp Client...');
        clearTimeout(reconnectTimer);
        if (sock) {
            try {
                sock.end(undefined);
            } catch (err) {
                appLogger.error({ err: err.message }, 'Error ending socket');
            }
            sock = null;
        }
        latestQr = '';
        connectionStatus = 'DISCONNECTED';
        isMockMode = false;
        broadcastStatus();
        initWhatsApp();
    }

    async function clearSession() {
        appLogger.info('Clearing WhatsApp Session...');
        clearTimeout(reconnectTimer);
        if (sock) {
            try {
                sock.end(undefined);
            } catch (err) {
                appLogger.error({ err: err.message }, 'Error ending socket');
            }
            sock = null;
        }

        if (fs.existsSync(AUTH_FOLDER)) {
            try {
                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                appLogger.info('Baileys auth folder cleared successfully.');
            } catch (err) {
                appLogger.error({ err: err.message }, 'Failed to delete Baileys auth directory');
                throw err;
            }
        }

        try {
            const db = require('../config/database');
            if (process.env.DATABASE_URL && !db.useJsonDb()) {
                await db.query("DELETE FROM whatsapp_creds");
                appLogger.info('Database auth credentials cleared successfully.');
            }
        } catch (err) {
            appLogger.error({ err: err.message }, 'Failed to clear database auth credentials');
        }

        latestQr = '';
        connectionStatus = 'DISCONNECTED';
        isMockMode = false;
        broadcastStatus();
        initWhatsApp();
    }

    async function destroyWhatsApp() {
        appLogger.info('Shutting down WhatsApp client...');
        if (globalKeysFlush) {
            try {
                await globalKeysFlush();
            } catch (err) {
                appLogger.error({ err: err.message }, 'Error flushing final keys on destroy');
            }
        }
        if (sock) {
            try {
                sock.end(undefined);
            } catch (err) {
                appLogger.error({ err: err.message }, 'Error ending socket');
            }
            sock = null;
        }
    }

    module.exports = {
        initWhatsApp,
        sendMessageToGroup,
        getChats,
        getStatus: () => ({ status: connectionStatus, qr: latestQr, isMock: isMockMode }),
        isMock: () => isMockMode,
        setWsBroadcaster,
        restartWhatsApp,
        clearSession,
        destroyWhatsApp,
        requestPairingCode
    };
}
