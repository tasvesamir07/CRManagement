const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';
const ALT_CSRF_HEADER_NAME = 'x-xsrf-token';

/**
 * Generate cryptographically secure CSRF token.
 */
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware that sets the XSRF-TOKEN cookie on read requests
 * and validates CSRF tokens on mutating requests.
 */
function csrfProtection(req, res, next) {
    // 1. Ensure a CSRF token cookie is present for the client to read
    let token = req.cookies?.[CSRF_COOKIE_NAME];
    if (!token) {
        token = generateCsrfToken();
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false, // Must be readable by client JS to send in request header
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/'
        });
    }

    // 2. Safe HTTP methods (GET, HEAD, OPTIONS) do not alter server state
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // 3. Webhook endpoints or external callback paths if any (e.g. canva/meta)
    if (req.path.includes('/webhooks') || req.path.includes('/callback')) {
        return next();
    }

    // 4. If request has explicit Authorization: Bearer header, browser cross-origin ambient
    // credential forgery (CSRF) is impossible because browsers never automatically attach custom Bearer headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return next();
    }

    // 5. For cookie-authenticated or session-based mutating requests, enforce Double-Submit Cookie CSRF check
    const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[ALT_CSRF_HEADER_NAME];
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return res.status(403).json({
            error: 'Invalid or missing CSRF token. Please include X-CSRF-Token or Authorization Bearer header.'
        });
    }

    next();
}

/**
 * Explicit endpoint handler to fetch a fresh CSRF token if needed by SPA clients.
 */
function getCsrfTokenHandler(req, res) {
    let token = req.cookies?.[CSRF_COOKIE_NAME];
    if (!token) {
        token = generateCsrfToken();
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/'
        });
    }
    return res.json({ csrfToken: token });
}

module.exports = {
    csrfProtection,
    getCsrfTokenHandler,
    generateCsrfToken
};
