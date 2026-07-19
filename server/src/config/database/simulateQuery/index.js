const { readJsonDb, writeJsonDb } = require('../jsonDb');
const auth = require('./auth');
const course = require('./course');
const platform = require('./platform');
const file = require('./file');
const announcement = require('./announcement');
const misc = require('./misc');
const logger = require('../../logger');

async function simulateQuery(text, params = []) {
    const db = readJsonDb();
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    const ctx = { writeJsonDb };

    const handlers = [auth, course, platform, file, announcement, misc];
    for (const handler of handlers) {
        const result = handler.handle(normalizedText, params, db, ctx);
        if (result !== null) return result;
    }

    logger.warn({ query: text.slice(0, 200), params }, 'Unhandled JSON DB query');
    return { rows: [] };
}

module.exports = { simulateQuery };
