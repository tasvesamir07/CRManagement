const fs = require('fs');
const path = require('path');
const pino = require('pino');

const isVercel = !!process.env.VERCEL;

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion;
if (!isVercel) {
    try {
        const baileys = require('@whiskeysockets/baileys');
        makeWASocket = baileys.makeWASocket;
        useMultiFileAuthState = baileys.useMultiFileAuthState;
        DisconnectReason = baileys.DisconnectReason;
        fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
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
const pairingResolve = null;

const AUTH_FOLDER = path.join(__dirname, '../../../.baileys_auth');

const logger = pino({ level: 'silent' });

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
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            auth: state,
            version,
            logger,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            browser: ['CR Announcement', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: false,
            keepAliveIntervalMs: 15000,
            connectTimeoutMs: 60000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                latestQr = qr;
                connectionStatus = 'QR_READY';
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
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                connectionStatus = 'DISCONNECTED';
                latestQr = '';
                broadcastStatus();

                sock = null;

                if (shouldReconnect) {
                    let delay = 5000;
                    if (!hasEverBeenConnected && statusCode !== 408) {
                        delay = 30000;
                    }
                    console.log(`WhatsApp disconnected (reason=${statusCode}, wasConnected=${hasEverBeenConnected}). Reconnecting in ${delay / 1000}s...`);
                    setTimeout(initWhatsApp, delay);
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

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone) {
        throw new Error('Invalid phone number format. Please provide a valid phone number.');
    }

    if (connectionStatus === 'CONNECTED') {
        throw new Error('WhatsApp is already connected. No pairing needed.');
    }

    if (!sock) {
        initWhatsApp();
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1000));
            if (sock) break;
        }
        if (!sock) {
            throw new Error('WhatsApp client failed to initialize after waiting. Please try again.');
        }
    }

    try {
        const code = await sock.requestPairingCode(cleanPhone);
        return { code };
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
            { id: '12036329481920@g.us', name: 'Mock WhatsApp General Group', isGroup: true },
            { id: '12036329483344@g.us', name: 'Mock SWE Course Group', isGroup: true }
        ];
    }

    try {
        const chats = await sock.groupFetchAllParticipating();
        const groups = Object.values(chats).map(group => ({
            id: group.id,
            name: group.subject || group.id,
            isGroup: true
        }));
        return groups;
    } catch (err) {
        console.error('Error fetching WhatsApp chats:', err.message);
        return [];
    }
}

async function restartWhatsApp() {
    console.log('🔄 Restarting WhatsApp Client...');
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
