const logger = require('../config/logger');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Returns true if an error message is safe to send to client without leaking internal infrastructure details.
 */
function isSafeClientMessage(msg) {
    if (!msg || typeof msg !== 'string') return false;
    const dangerousPatterns = [
        /SELECT\s/i, /INSERT\s/i, /UPDATE\s/i, /DELETE\s/i, /FROM\s/i,
        /relation\s".*"\sdoes\snot\sexist/i,
        /syntax\serror/i,
        /connection\srefused/i,
        /password\sauthentication/i,
        /ECONNREFUSED/i,
        /ETIMEDOUT/i,
        /pg_/i,
        /node_modules/i,
        /\.js:\d+/i,
        /column\s".*"\sdoes\snot\sexist/i,
        /database\s".*"\sdoes\snot\sexist/i
    ];
    return !dangerousPatterns.some(pattern => pattern.test(msg));
}

/**
 * Helper to respond to client-side errors (400, 404, etc.) while sanitizing
 * against inadvertent database/server crash leakage.
 */
function handleClientError(res, err, defaultStatus = 400, fallbackMessage = 'Invalid request.') {
    logger.warn({ err }, fallbackMessage);
    const rawMsg = err?.message || fallbackMessage;
    
    // In production, mask raw messages that look like database query errors or stack traces
    if (isProduction && !isSafeClientMessage(rawMsg)) {
        return res.status(500).json({ error: 'Internal server error' });
    }
    
    return res.status(defaultStatus).json({ error: rawMsg });
}

/**
 * Helper to safely respond to server errors in route handlers without leaking internals.
 * Logs the full error with stack trace and correlation ID server-side.
 * Returns a sanitized generic message in production.
 */
function handleServerError(res, err, publicMessage = 'Internal server error') {
    logger.error({ err }, publicMessage);
    
    // In production, do not leak internal exception details/paths/DB queries to the client
    const message = isProduction ? publicMessage : (err?.message || publicMessage);
    return res.status(500).json({ error: message });
}

/**
 * Centralized Express error-handling middleware.
 */
function errorHandler(err, req, res, _next) {
    const statusCode = err.status || err.statusCode || 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    logger.error({
        err,
        path: req.originalUrl,
        method: req.method,
        statusCode
    }, isClientError ? 'Client request error' : 'Unhandled server error');

    if (res.headersSent) {
        return;
    }

    if (isClientError) {
        const rawMsg = err.message || 'Bad Request';
        const msg = (isProduction && !isSafeClientMessage(rawMsg)) ? 'Invalid request' : rawMsg;
        return res.status(statusCode).json({ error: msg });
    }

    return res.status(statusCode).json({
        error: isProduction ? 'Internal server error' : (err.message || 'Internal server error')
    });
}

module.exports = {
    errorHandler,
    handleServerError,
    handleClientError,
    isSafeClientMessage
};
