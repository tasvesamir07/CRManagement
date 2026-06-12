require('dotenv').config();

// === Environment Validation ===
const REQUIRED_ENV_VARS = ['JWT_SECRET'];
const OPTIONAL_BUT_WARN = ['DATABASE_URL', 'TELEGRAM_BOT_TOKEN', 'SMTP_HOST'];
let envError = null;
for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
        const msg = `FATAL: Required environment variable ${key} is not set.`;
        console.error(msg);
        if (process.env.VERCEL) {
            envError = new Error(msg);
        } else {
            process.exit(1);
        }
    }
}
for (const key of OPTIONAL_BUT_WARN) {
    if (!process.env[key]) {
        console.warn(`WARN: ${key} is not set. Related features will be disabled or use fallback.`);
    }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const WebSocket = require('ws');
const nodeCron = require('node-cron');

// Import services & configs
const logger = require('./src/config/logger');
const db = require('./src/config/database');
const whatsappService = require('./src/services/whatsapp.service');
const telegramService = require('./src/services/telegram.service');
const fileService = require('./src/services/file.service');
const announcementService = require('./src/services/announcement.service');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "*"],
            connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "https://*.supabase.co"],
            fontSrc: ["'self'", "data:"],
            mediaSrc: ["'self'", "blob:"],
            frameSrc: ["'none'"],
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
app.use(cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static route for locally uploaded files
app.use('/uploads', express.static(fileService.uploadsDir));

// On Vercel: check startup errors first
app.use((req, res, next) => {
    if (!process.env.VERCEL) return next();
    if (envError) {
        return res.status(500).json({ error: envError.message });
    }
    next();
});

// Wait for DB init (critical on Vercel cold starts)
app.use(async (req, res, next) => {
    if (!process.env.VERCEL) return next();
    try {
        await db.waitForInit();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database initialization failed', details: err.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date() });
});

// Import route modules
const authRoutes = require('./src/routes/auth.routes');
const coursesRoutes = require('./src/routes/courses.routes');
const routinesRoutes = require('./src/routes/routines.routes');
const platformsRoutes = require('./src/routes/platforms.routes');
const filesRoutes = require('./src/routes/files.routes');
const announcementsRoutes = require('./src/routes/announcements.routes');
const adminRoutes = require('./src/routes/admin.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const templatesRoutes = require('./src/routes/templates.routes');
const bulkRoutes = require('./src/routes/bulk.routes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/bulk', bulkRoutes);

// Error Handling Middleware
app.use((err, req, res, _next) => {
    logger.error({ err }, 'Unhandled server error');
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Create HTTP server
const server = http.createServer(app);

const isVercel = !!process.env.VERCEL;

// Create WebSocket server (skipped on Vercel as it doesn't support persistent WebSockets)
let wss = null;
const clients = new Set();

if (!isVercel) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        logger.info('WebSocket client connected');
        clients.add(ws);
        
        // Immediately send current WhatsApp status upon connection
        ws.send(JSON.stringify({
            type: 'whatsapp_status',
            data: whatsappService.getStatus()
        }));
        
        ws.on('close', () => {
            logger.info('WebSocket client disconnected');
            clients.delete(ws);
        });
        
        ws.on('error', (err) => {
            logger.error({ err }, 'WebSocket client error');
        });
    });
}

// Hook up WhatsApp service to broadcast to WS clients
whatsappService.setWsBroadcaster((payload) => {
    if (isVercel) return;
    const message = JSON.stringify(payload);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
});

// Hook up Announcement service to broadcast to WS clients
announcementService.setWsBroadcaster((payload) => {
    if (isVercel) return;
    const message = JSON.stringify(payload);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
});

// Start services (Skip WhatsApp client on Vercel as it requires persistent session/WebSocket)
if (!isVercel) {
    whatsappService.initWhatsApp();
}
telegramService.initTelegram();

// Skip active crons and recursive schedulers on Vercel as it is an ephemeral serverless environment
if (!isVercel) {
    // Schedule daily cleanup at midnight (0 0 * * *)
    // We run it every night to clean up files older than 15 days
    nodeCron.schedule('0 0 * * *', async () => {
        logger.info('Running scheduled midnight file cleanup...');
        try {
            await fileService.cleanupExpiredFiles();
        } catch (err) {
            logger.error({ err }, 'Error during scheduled file cleanup');
        }
    });

    // Process due scheduled announcements
    // Uses recursive setTimeout to prevent overlapping runs
    let schedulerTimeout = null;
    let scheduledProcessing = false;
    const processScheduledAnnouncements = async () => {
        if (scheduledProcessing) return;
        scheduledProcessing = true;
        try {
            const due = await announcementService.getDueScheduledAnnouncements();
            for (const ann of due) {
                try {
                    // Mark as sending immediately to prevent re-pickup by a concurrent tick
                    await announcementService.markAnnouncementSending(ann.id);
                    logger.info({ annId: ann.id, title: ann.title }, 'Sending scheduled announcement');
                    await announcementService.sendAnnouncement(ann.id);
                    logger.info({ annId: ann.id }, 'Scheduled announcement sent successfully');
                } catch (sendErr) {
                    logger.error({ annId: ann.id, err: sendErr }, 'Failed to send scheduled announcement');
                    // Mark as failed so it won't be retried forever
                    try {
                        await announcementService.markAnnouncementFailed(ann.id);
                    } catch (markErr) {
                        logger.error({ annId: ann.id, err: markErr }, 'Failed to mark announcement as failed');
                    }
                }
            }
        } catch (err) {
            logger.error({ err }, 'Error processing scheduled announcements');
        } finally {
            scheduledProcessing = false;
            // Schedule next check after this run completes
            schedulerTimeout = setTimeout(processScheduledAnnouncements, 30000);
        }
    };

    // Start the scheduler loop
    processScheduledAnnouncements();
}

// Start listening (skipped on Vercel — @vercel/node runtime handles this)
if (!isVercel) {
    server.listen(PORT, () => {
        logger.info({ port: PORT }, 'CR Announcement Server started');
    });
}

// Export Express app for Vercel
if (isVercel) {
    console.log('✅ CR Announcement server loaded on Vercel');
}
module.exports = app;

// Graceful shutdown helper
const gracefulShutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    
    try {
        // Stop cron jobs
        try {
            const cronTasks = nodeCron.getTasks();
            cronTasks.forEach(task => task.stop());
            logger.info('Cron jobs stopped.');
        } catch (_) {}
        
        try {
            await whatsappService.destroyWhatsApp();
            logger.info('WhatsApp client closed.');
        } catch (err) {
            logger.error({ err }, 'Error during WhatsApp client destruction');
        }
        
        if (wss) {
            try {
                wss.close(() => logger.info('WebSocket server closed.'));
            } catch (_) {}
        }
        
        server.close(() => {
            logger.info('HTTP server closed.');
            process.exit(0);
        });
        
        setTimeout(() => {
            logger.error('Forced shutdown after timeout.');
            process.exit(1);
        }, 10000);
    } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
    }
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Trigger nodemon restart after package install
