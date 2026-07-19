function success(res, data, status = 200) {
    return res.status(status).json(data);
}

function created(res, data) {
    return res.status(201).json(data);
}

function noContent(res) {
    return res.status(204).end();
}

function badRequest(res, message, details = null) {
    const body = { error: message };
    if (details) body.details = details;
    return res.status(400).json(body);
}

function unauthorized(res, message = 'Unauthorized') {
    return res.status(401).json({ error: message });
}

function forbidden(res, message = 'Forbidden') {
    return res.status(403).json({ error: message });
}

function notFound(res, message = 'Resource not found') {
    return res.status(404).json({ error: message });
}

function serverError(res, message = 'Internal server error') {
    return res.status(500).json({ error: message });
}

function handleRouteError(res, err, statusMap = {}) {
    const message = err.message || 'Internal server error';
    const status = statusMap[message] || 500;
    return res.status(status).json({ error: message });
}

module.exports = {
    success, created, noContent,
    badRequest, unauthorized, forbidden, notFound, serverError,
    handleRouteError
};
