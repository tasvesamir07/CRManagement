const fs = require('fs');
const path = require('path');
const pino = require('pino');

const isVercel = !!process.env.VERCEL;

let makeWASocket, DisconnectReason, fetchLatestBaileysVersion, Browsers;
if (!isVercel) {
    try {
        const baileys = require('@whiskeysockets/baileys');
        makeWASocket = baileys.makeWASocket;
        DisconnectReason = baileys.DisconnectReason;
        fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
        Browsers = baileys.Browsers;
    } catch (err) {
        console.error('Failed to load @whiskeysockets/baileys:', err.message);
    }
}

let sock = null;
let connectionStatus = 'DISCONNECTED';
let latestQr = '';
let wsBroadcaster = null;
let isMockMode = isVercel;
let hasEverBeenConnected = false;
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
            console.error('DB auth init failed, using file fallback:', err.message);
            return useMultiFileAuthState(AUTH_FOLDER);
        }
    } else {
        return useMultiFileAuthState(AUTH_FOLDER);
    }

    if (!credsData) credsData = initAuthCreds();

    const keys = {
        get: async (type, ids) => {
            const data = keysStore[type] || {};
            if (!ids) return data;
            const r = {};
            for (const id of ids) if (data[id] !== undefined) r[id] = data[id];
            return r;
        },
        set: async (data) => {
            for (const type in data) {
                if (!keysStore[type]) keysStore[type] = {};
                Object.assign(keysStore[type], data[type]);
            }
            await db.query(`INSERT INTO whatsapp_creds (type, data, updated_at) VALUES ('keys', $1::jsonb, NOW()) ON CONFLICT (type) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [JSON.stringify(keysStore)]);
        },
        delete: async () => {}
    };

    const saveCreds = async () => {
        await db.query(`INSERT INTO whatsapp_creds (type, data, updated_at) VALUES ('creds', $1::jsonb, NOW()) ON CONFLICT (type) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [JSON.stringify(credsData)]);
    };

    return { state: { creds: credsData, keys }, saveCreds };
}

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

async function initWhatsApp() {
    if (isMockMode) {
        console.log('WhatsApp service running in Mock Mode. Skipping initialization.');
        connectionStatus = 'DISCONNECTED';
        broadcastStatus();
        return;
    }

    if (sock) {
        console.log('WhatsApp client already initialized.');
        return;
    }



    console.log('Initializing WhatsApp Client (Baileys)...');
    connectionStatus = 'CONNECTING';
    broadcastStatus();

    try {
        const { state, saveCreds } = await useDbAuthState();
        
        let version = [2, 3000, 1015941307];
        try {
            const latest = await fetchLatestBaileysVersion();
            version = latest.version;
        } catch (verErr) {
            console.warn('⚠️ Failed to fetch latest Baileys version, using fallback:', verErr.message);
        }

        sock = makeWASocket({
            auth: state,
            version,
            logger,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            browser: Browsers ? Browsers.ubuntu('Chrome') : ['Chrome (Linux)', '', ''],
            generateHighQualityLinkPreview: false,
            keepAliveIntervalMs: 15000,
            connectTimeoutMs: 60000
        });

        sock.ev.on('creds.update', (update) => {
            const wasQrReady = connectionStatus === 'QR_READY';
            saveCreds(update);
            if (wasQrReady) {
                console.log('WhatsApp QR scanned, authenticating...');
                connectionStatus = 'CONNECTING';
                broadcastStatus();
            }
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('WhatsApp QR emitted (new code ready for scanning)');
                latestQr = qr;
                connectionStatus = 'QR_READY';
                broadcastStatus();
            }

            if (connection === 'connecting') {
                console.log('🔄 WhatsApp client is connecting...');
                connectionStatus = 'CONNECTING';
                broadcastStatus();
            }

            if (connection === 'open') {
                console.log('✅ WhatsApp client is ready and connected!');
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
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                connectionStatus = 'DISCONNECTED';
                latestQr = '';
                broadcastStatus();

                sock = null;

                if (shouldReconnect) {
                    let delay = 10000;
                    if (statusCode === 408) delay = 10000;
                    else if (!hasEverBeenConnected) {
                        delay = 10000;
                        console.error(`WhatsApp connection error: ${errMsg}`);
                    }
                    console.log(`WhatsApp disconnected (reason=${statusCode}, wasConnected=${hasEverBeenConnected}). Reconnecting in ${delay / 1000}s...`);
                    clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(initWhatsApp, delay);
                } else {
                    console.log(`WhatsApp logged out (reason=${statusCode}). Please re-link your device.`);
                    isMockMode = false;
                }
            }
        });

        sock.ev.on('messages.upsert', () => {});
    } catch (err) {
        console.error('⚠️ Failed to initialize WhatsApp client. Running in Mock Mode.', err.message);
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

    // Crucial: Wait a few seconds for the websocket to fully stabilize and connect to Meta
    console.log(`Waiting for socket stabilization before requesting code for: ${cleanPhone}...`);
    await new Promise(r => setTimeout(r, 3000));

    try {
        const code = await sock.requestPairingCode(cleanPhone);
        // Format code with a dash to make it easy to read (e.g., ABCD-EFGH)
        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
        return { code: formattedCode };
    } catch (err) {
        console.error('Pairing code request failed:', err.message);
        throw new Error('Failed to request pairing code: ' + err.message);
    }
}

async function sendMessageToGroup(chatId, message, filePath = null) {
    console.log(`Sending WhatsApp message to group: ${chatId}`);

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
        console.log(`[Mock] WhatsApp message sent to ${chatId}: ${message}`);
        files.forEach((f, idx) => {
            console.log(`[Mock] WhatsApp attachment ${idx + 1}: ${f.path} (Original: ${f.originalName})`);
        });
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

            for (let i = 1; i < files.length; i++) {
                if (fs.existsSync(files[i].path)) {
                    try {
                        const extraData = fs.readFileSync(files[i].path);
                        const extraExt = path.extname(files[i].path).toLowerCase();
                        const extraMime = extraExt === '.png' ? 'image/png'
                            : extraExt === '.jpg' || extraExt === '.jpeg' ? 'image/jpeg'
                            : extraExt === '.gif' ? 'image/gif'
                            : extraExt === '.pdf' ? 'application/pdf'
                            : 'application/octet-stream';

                        if (extraMime.startsWith('image/')) {
                            await sock.sendMessage(targetId, { image: extraData });
                        } else {
                            await sock.sendMessage(targetId, {
                                document: extraData,
                                mimetype: extraMime,
                                fileName: files[i].originalName
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to send extra file ${files[i].path} to WhatsApp:`, err.message);
                    }
                }
            }
        } else {
            sentMsg = await sock.sendMessage(targetId, { text: message });
        }

        const msgId = sentMsg?.key?.id || 'unknown';
        return { success: true, messageId: msgId };
    } catch (err) {
        console.error(`Error sending WhatsApp message to ${chatId}:`, err.message);
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

        // Build a mapping of parent community JID to its subject/name
        const communityNames = {};
        for (const chat of chatValues) {
            if (chat.isCommunity) {
                communityNames[chat.id] = chat.subject || chat.id;
            }
        }

        const groups = chatValues
            .filter(group => !group.isCommunity) // Filter out the parent community groups since they cannot receive messages
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
        console.error('Error fetching WhatsApp chats:', err.message);
        return [];
    }
}

async function restartWhatsApp() {
    console.log('🔄 Restarting WhatsApp Client...');
    clearTimeout(reconnectTimer);
    if (sock) {
        try {
            sock.end(undefined);
        } catch (err) {
            console.error('Error ending socket:', err.message);
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
    console.log('🧹 Clearing WhatsApp Session...');
    clearTimeout(reconnectTimer);
    if (sock) {
        try {
            sock.end(undefined);
        } catch (err) {
            console.error('Error ending socket:', err.message);
        }
        sock = null;
    }

    if (fs.existsSync(AUTH_FOLDER)) {
        try {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            console.log('✅ Baileys auth folder cleared successfully.');
        } catch (err) {
            console.error('❌ Failed to delete Baileys auth directory:', err.message);
            throw err;
        }
    }

    latestQr = '';
    connectionStatus = 'DISCONNECTED';
    isMockMode = false;
    broadcastStatus();
    initWhatsApp();
}

async function destroyWhatsApp() {
    console.log('Shutting down WhatsApp client...');
    if (sock) {
        try {
            sock.end(undefined);
        } catch (err) {
            console.error('Error ending socket:', err.message);
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
