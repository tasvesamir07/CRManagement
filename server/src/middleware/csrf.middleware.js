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

function getCookieOptions(req) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    return {
        httpOnly: false,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/'
    };
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
        res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions(req));
    }

    // 2. Safe HTTP methods (GET, HEAD, OPTIONS) do not alter server state
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    const fullPath = (req.originalUrl || req.path || '').toLowerCase();

    // 3. Exempt public authentication routes (login, register, password reset, 2FA)
    // These establish credentials and do not forge an existing authenticated browser session
    const isPublicAuthRoute = /\/auth\/(login|register|login-2fa|forgot-password|reset-password|verify-otp)/.test(fullPath);
    if (isPublicAuthRoute) {
        return next();
    }

    // 4. Webhook endpoints or external callback paths (e.g. canva/meta)
    if (fullPath.includes('/webhooks') || fullPath.includes('/callback')) {
        return next();
    }

    // 5. If request has explicit Authorization: Bearer header, browser cross-origin ambient
    // credential forgery (CSRF) is impossible because browsers never automatically attach custom Bearer headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return next();
    }

    // 6. If request has no authenticated session cookie (cr_token), there is no ambient credential to forge
    if (!req.cookies?.cr_token) {
        return next();
    }

    // 7. For cookie-authenticated mutating requests, enforce Double-Submit Cookie CSRF check
    const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[ALT_CSRF_HEADER_NAME];
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    if (!headerToken || !cookieToken || headerToken.length !== cookieToken.length) {
        return res.status(403).json({
            error: 'Invalid or missing CSRF token. Please include X-CSRF-Token or Authorization Bearer header.'
        });
    }

    try {
        const headerBuf = Buffer.from(headerToken);
        const cookieBuf = Buffer.from(cookieToken);
        if (!crypto.timingSafeEqual(headerBuf, cookieBuf)) {
            return res.status(403).json({
                error: 'Invalid or missing CSRF token. Please include X-CSRF-Token or Authorization Bearer header.'
            });
        }
    } catch (_) {
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
        res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions(req));
    }
    return res.json({ csrfToken: token });
}

module.exports = {
    csrfProtection,
    getCsrfTokenHandler,
    generateCsrfToken
};
