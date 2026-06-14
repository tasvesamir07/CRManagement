const express = require('express');
const cors = require('cors');
const { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3003;
const SECRET = process.env.WHATSAPP_RELAY_SECRET || 'change-me-in-production';
const AUTH_FOLDER = path.join(__dirname, '.baileys_auth');

const logger = pino({ level: 'silent' });
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

function auth(req, res, next) {
    if (req.headers['x-relay-secret'] !== SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

let sock = null;
let connectionStatus = 'DISCONNECTED';
let latestQr = '';
let processExitCalled = false;

async function initWhatsApp() {
    if (processExitCalled) return;
    console.log('[Relay] Initializing WhatsApp...');
    connectionStatus = 'CONNECTING';

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        let version;
        try {
            const latest = await fetchLatestBaileysVersion();
            version = latest.version;
        } catch {
            version = [2, 3000, 1035194821];
        }

        sock = makeWASocket({
            auth: state,
            version,
            logger,
            printQRInTerminal: true,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            browser: Browsers.ubuntu('Chrome'),
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
                console.log('[Relay] QR code ready. Scan with WhatsApp.');
                try { require('qrcode-terminal').generate(qr, { small: true }); } catch {}
            }

            if (connection === 'connecting') {
                connectionStatus = 'CONNECTING';
            }

            if (connection === 'open') {
                connectionStatus = 'CONNECTED';
                latestQr = '';
                console.log('[Relay] WhatsApp connected!');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                connectionStatus = 'DISCONNECTED';
                sock = null;
                console.log(`[Relay] Disconnected (reason=${statusCode}). Reconnecting in 5s...`);
                if (!processExitCalled) {
                    setTimeout(initWhatsApp, 5000);
                }
            }
        });
    } catch (err) {
        console.error('[Relay] Init error:', err.message);
        connectionStatus = 'DISCONNECTED';
        if (!processExitCalled) {
            setTimeout(initWhatsApp, 10000);
        }
    }
}

// --- API Endpoints ---

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/status', auth, (req, res) => {
    res.json({ status: connectionStatus, qr: connectionStatus === 'QR_READY' ? latestQr : '' });
});

app.get('/qr', auth, (req, res) => {
    if (connectionStatus !== 'QR_READY' || !latestQr) {
        return res.json({ qr: null });
    }
    res.json({ qr: latestQr });
});

app.post('/pair', auth, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });

    if (!sock || connectionStatus === 'DISCONNECTED') {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    try {
        const code = await sock.requestPairingCode(phone.replace(/[^0-9]/g, ''));
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
        res.json({ code: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/send-message', auth, async (req, res) => {
    const { chatId, message, files } = req.body;
    if (!chatId || !message) return res.status(400).json({ error: 'chatId and message required' });

    if (!sock || connectionStatus !== 'CONNECTED') {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    try {
        const targetId = chatId.includes('@') ? chatId : `${chatId}@g.us`;
        let sentMsg;

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const data = file.data ? Buffer.from(file.data, 'base64') : null;
                if (!data) continue;
                const mime = file.mimetype || '';
                const caption = i === 0 ? message : undefined;
                const msgContent = mime.startsWith('image/')
                    ? { image: data, caption: caption, mimetype: mime }
                    : mime.startsWith('video/')
                    ? { video: data, caption: caption, mimetype: mime }
                    : { document: data, mimetype: mime || 'application/octet-stream', fileName: file.name || 'file', caption: caption };
                sentMsg = await sock.sendMessage(targetId, msgContent);
            }
        } else {
            sentMsg = await sock.sendMessage(targetId, { text: message });
        }

        res.json({ success: true, messageId: sentMsg?.key?.id || 'unknown' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/groups', auth, async (req, res) => {
    if (!sock || connectionStatus !== 'CONNECTED') {
        return res.json({ groups: [
            { id: '12036329481920@g.us', name: 'General Community' },
            { id: '12036329483344@g.us', name: 'Announcement Community' }
        ]});
    }

    try {
        const chats = await sock.groupFetchAllParticipating();
        const groups = Object.values(chats)
            .filter(g => !g.isCommunity)
            .map(g => ({ id: g.id, name: g.subject || g.id, isGroup: true }));
        res.json({ groups });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/restart', auth, (req, res) => {
    if (sock) { try { sock.end(undefined); } catch {} sock = null; }
    connectionStatus = 'DISCONNECTED';
    latestQr = '';
    res.json({ success: true });
    setTimeout(initWhatsApp, 1000);
});

app.post('/clear-session', auth, (req, res) => {
    if (sock) { try { sock.end(undefined); } catch {} sock = null; }
    if (fs.existsSync(AUTH_FOLDER)) {
        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
    connectionStatus = 'DISCONNECTED';
    latestQr = '';
    res.json({ success: true });
    setTimeout(initWhatsApp, 1000);
});

process.on('SIGTERM', () => {
    processExitCalled = true;
    if (sock) sock.end(undefined);
    process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Relay] WhatsApp relay server listening on port ${PORT}`);
    console.log(`[Relay] AUTH_FOLDER: ${AUTH_FOLDER}`);
    initWhatsApp();
});
