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
const url = require('url');
const crypto = require('crypto');
const nodeCron = require('node-cron');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

// Import services & configs
const logger = require('./src/config/logger');
const { run: runWithContext } = require('./src/config/requestContext');
console.log('[BOOT] Loading modules...');
const db = require('./src/config/database');
console.log('[BOOT]   database.js loaded');
const authService = require('./src/services/auth.service');
console.log('[BOOT]   auth.service loaded');
const whatsappService = require('./src/services/whatsapp.service');
console.log('[BOOT]   whatsapp.service loaded');
const telegramService = require('./src/services/telegram.service');
console.log('[BOOT]   telegram.service loaded');
const messengerService = require('./src/services/messenger.service');
console.log('[BOOT]   messenger.service loaded');
const fileService = require('./src/services/file.service');
console.log('[BOOT]   file.service loaded');
const announcementService = require('./src/services/announcement.service');
console.log('[BOOT]   announcement.service loaded');
const metrics = require('./src/services/metrics.service');
console.log('[BOOT] All modules loaded');

// Initialize Express app
const app = express();
app.set('trust proxy', 1); // trust first proxy (Render LB) for rate-limiter
const PORT = process.env.PORT || 5000;

// Request tracing — attach correlation ID to every request via AsyncLocalStorage
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  runWithContext({ correlationId: req.correlationId, userId: req.user?.id }, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      logger.debug({ method: req.method, path: req.path, status: res.statusCode, duration: `${duration}ms`, correlationId: req.correlationId }, 'API request');
    }
    const pathGroup = req.route?.path || req.path.split('?')[0];
    metrics.inc('httpRequestsTotal', req.method, pathGroup, String(res.statusCode));
    metrics.observe('httpRequestDurationMs', duration, req.method, pathGroup);
  });
  next();
});

// Security and utility middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "*"],
            connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "https://*.supabase.co", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            mediaSrc: ["'self'", "blob:"],
            frameSrc: ["'none'"],
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
const isWildcardOrigin = corsOrigin === '*';
const allowedOrigins = isWildcardOrigin ? '*' : corsOrigin.split(',').map(s => s.trim());
app.use(cors({
    origin: isWildcardOrigin
        ? '*'
        : (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
                cb(null, true);
            } else {
                cb(null, false);
            }
        },
    credentials: !isWildcardOrigin
}));
app.use(compression());
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

// Health check endpoint (supports root, legacy /api/health, and /api/v1/health)
app.get(['/health', '/api/health', '/api/v1/health'], async (req, res) => {
    const checks = {
        database: false,
        whatsapp: false,
        telegram: false,
        messenger: false,
    };
    try {
        await db.query('SELECT 1');
        checks.database = true;
    } catch (_) {}
    try {
        const ws = whatsappService.getStatus();
        checks.whatsapp = ws.status === 'CONNECTED' || ws.status === 'QR_READY';
    } catch (_) {}
    try {
        checks.telegram = !telegramService.isMock();
    } catch (_) {}
    try {
        checks.messenger = !messengerService.isMock();
    } catch (_) {}
    const allOk = Object.values(checks).every(Boolean);
    res.status(checks.database ? 200 : 503).json({
        status: allOk ? 'healthy' : 'degraded',
        time: new Date().toISOString(),
        correlationId: req.correlationId,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: checks,
        version: '1.0.0',
    });
});

// Metrics endpoint (Prometheus text format)
app.get('/metrics', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics.formatMetrics());
});

// Root welcome endpoint
app.get('/', (req, res) => {
    res.send('CR Announcement API Server is running successfully!');
});

// API Documentation (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'CR Announcement Dashboard API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true
    }
}));

// JSON version of the OpenAPI spec
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
});

// WebSocket availability check (client uses this to decide whether to connect WS)
app.get('/api/ws-available', (req, res) => {
    res.json({ available: !isVercel, reason: isVercel ? 'Vercel serverless does not support persistent WebSockets' : null });
});

// Import route modules
console.log('[BOOT] Loading route modules...');
const authRoutes = require('./src/routes/auth.routes'); console.log('[BOOT]   auth.routes loaded');
const coursesRoutes = require('./src/routes/courses.routes'); console.log('[BOOT]   courses.routes loaded');
const routinesRoutes = require('./src/routes/routines.routes'); console.log('[BOOT]   routines.routes loaded');
const platformsRoutes = require('./src/routes/platforms.routes'); console.log('[BOOT]   platforms.routes loaded');
const filesRoutes = require('./src/routes/files.routes'); console.log('[BOOT]   files.routes loaded');
const announcementsRoutes = require('./src/routes/announcements.routes'); console.log('[BOOT]   announcements.routes loaded');
const adminRoutes = require('./src/routes/admin.routes'); console.log('[BOOT]   admin.routes loaded');
const analyticsRoutes = require('./src/routes/analytics.routes'); console.log('[BOOT]   analytics.routes loaded');
const templatesRoutes = require('./src/routes/templates.routes'); console.log('[BOOT]   templates.routes loaded');
const bulkRoutes = require('./src/routes/bulk.routes'); console.log('[BOOT]   bulk.routes loaded');
const logsRoutes = require('./src/routes/logs.routes'); console.log('[BOOT]   logs.routes loaded');
const studentsRoutes = require('./src/routes/students.routes'); console.log('[BOOT]   students.routes loaded');
const examRoutinesRoutes = require('./src/routes/examRoutines.routes'); console.log('[BOOT]   examRoutines.routes loaded');
const attendanceRoutes = require('./src/routes/attendance.routes'); console.log('[BOOT]   attendance.routes loaded');
const canvaRoutes = require('./src/routes/canva.routes'); console.log('[BOOT]   canva.routes loaded');

// Mount routes (both legacy /api and versioned /api/v1)
const mountRoutes = (prefix) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/courses`, coursesRoutes);
  app.use(`${prefix}/routines`, routinesRoutes);
  app.use(`${prefix}/platforms`, platformsRoutes);
  app.use(`${prefix}/files`, filesRoutes);
  app.use(`${prefix}/announcements`, announcementsRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/templates`, templatesRoutes);
  app.use(`${prefix}/bulk`, bulkRoutes);
  app.use(`${prefix}/logs`, logsRoutes);
  app.use(`${prefix}/students`, studentsRoutes);
  app.use(`${prefix}/exam-routines`, examRoutinesRoutes);
  app.use(`${prefix}/attendance`, attendanceRoutes);
  app.use(`${prefix}/canva`, canvaRoutes);
};
mountRoutes('/api');
mountRoutes('/api/v1');

// Error Handling Middleware
console.log('[BOOT] Mounting error middleware...');
app.use((err, req, res, _next) => {
    logger.error({ err }, 'Unhandled server error');
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Create HTTP server
console.log('[BOOT] Creating HTTP server...');
const server = http.createServer(app);

const isVercel = !!process.env.VERCEL;

// Create WebSocket server (skipped on Vercel as it doesn't support persistent WebSockets)
let wss = null;
const clients = new Set();

if (!isVercel) {
    wss = new WebSocket.Server({
        server,
        verifyClient: (info, cb) => {
            const query = url.parse(info.req.url, true).query;
            const token = query.token;

            if (!token) {
                cb(false, 401, 'Unauthorized: no token provided');
                return;
            }

            try {
                info.req.user = authService.verifyToken(token);
                cb(true);
            } catch {
                cb(false, 401, 'Unauthorized: invalid or expired token');
            }
        }
    });

    wss.on('connection', (ws, req) => {
        const wsCorrelationId = crypto.randomUUID();
        runWithContext({ correlationId: wsCorrelationId, userId: req.user?.id }, () => {
            metrics.inc('wsConnectionsTotal');
            metrics.inc('wsConnectionsCurrent');
            logger.info({ userId: req.user?.id, wsCorrelationId }, 'WebSocket client connected');
            clients.add(ws);
            ws.userId = req.user?.id;

            // Immediately send current WhatsApp status upon connection
            ws.send(JSON.stringify({
                type: 'whatsapp_status',
                data: whatsappService.getStatus()
            }));

            ws.on('close', () => {
                runWithContext({ correlationId: crypto.randomUUID(), userId: req.user?.id }, () => {
                    metrics.set('wsConnectionsCurrent', Math.max(0, clients.size - 1));
                    logger.info('WebSocket client disconnected');
                    clients.delete(ws);
                });
            });

            ws.on('error', (err) => {
                runWithContext({ correlationId: crypto.randomUUID(), userId: req.user?.id }, () => {
                    logger.error({ err }, 'WebSocket client error');
                });
            });
        });
    });
}

console.log('[BOOT] WebSocket server setup complete');

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
// Defer initialization by 30 seconds to prevent blocking initial requests and high CPU startup spikes
setTimeout(() => {
    logger.info('Initializing WhatsApp, Telegram, and Messenger clients...');
    if (!isVercel) {
        whatsappService.initWhatsApp();
    }
    telegramService.initTelegram();
    messengerService.initMessenger();
}, 30000);

// Skip active crons and recursive schedulers on Vercel as it is an ephemeral serverless environment
if (!isVercel) {
    const withBackgroundContext = (fn) => async (...args) => {
        const correlationId = `bg-${crypto.randomUUID()}`;
        await runWithContext({ correlationId }, () => fn(...args));
    };

    // Schedule daily cleanup at midnight (0 0 * * *)
    nodeCron.schedule('0 0 * * *', withBackgroundContext(async () => {
        logger.info('Running scheduled midnight file cleanup...');
        try {
            await fileService.cleanupExpiredFiles();
        } catch (err) {
            logger.error({ err }, 'Error during scheduled file cleanup');
        }
    }));

    // Process due scheduled announcements
    let scheduledProcessing = false;
    const processScheduledAnnouncements = withBackgroundContext(async () => {
        if (scheduledProcessing) return;
        scheduledProcessing = true;
        try {
            const due = await announcementService.getDueScheduledAnnouncements();
            await Promise.all(due.map(async (ann) => {
                try {
                    await announcementService.markAnnouncementSending(ann.id);
                    logger.info({ annId: ann.id, title: ann.title }, 'Sending scheduled announcement');
                    await announcementService.sendAnnouncement(ann.id);
                    logger.info({ annId: ann.id }, 'Scheduled announcement sent successfully');
                } catch (sendErr) {
                    logger.error({ annId: ann.id, err: sendErr }, 'Failed to send scheduled announcement');
                    try {
                        await announcementService.markAnnouncementFailed(ann.id);
                    } catch (markErr) {
                        logger.error({ annId: ann.id, err: markErr }, 'Failed to mark announcement as failed');
                    }
                }
            }));
        } catch (err) {
            logger.error({ err }, 'Error processing scheduled announcements');
        } finally {
            scheduledProcessing = false;
            setTimeout(processScheduledAnnouncements, 30000);
        }
    });

    processScheduledAnnouncements();
}

// Start listening (skipped on Vercel — @vercel/node runtime handles this)
console.log(`[BOOT] server.listen() reached. PORT=${PORT}, isVercel=${process.env.VERCEL ? 'yes' : 'no'}`);
if (!isVercel) {
    server.on('error', (err) => {
        console.error(`[FATAL] Server failed to bind: ${err.code || err.message}`);
        process.exit(1);
    });
    server.listen(PORT, () => {
        logger.info({ port: PORT }, 'CR Announcement Server started');
        console.log(`[BOOT] Server listening on port ${PORT}`);
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

// ---------- Crash Safety ----------
process.on('uncaughtException', (err) => {
    console.error(`[FATAL] Uncaught exception: ${err.message}\n${err.stack}`);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    console.error(`[FATAL] Unhandled rejection: ${reason instanceof Error ? reason.message : reason}`);
});

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Trigger nodemon restart after package install
