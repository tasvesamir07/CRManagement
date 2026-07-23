const { Pool } = require('pg');
const { initJsonDb } = require('./database/jsonDb');
const { simulateQuery } = require('./database/simulateQuery');
const { getCorrelationId } = require('./requestContext');
const { inc, dbQueryType } = require('../services/metrics.service');
const logger = require('./logger');

let pool = null;
let useJsonDb = false;
let dbInitError = null;
const isVercel = !!process.env.VERCEL;

function getSslConfig(url) {
    if (!url) return false;
    if (process.env.DB_SSL === 'false') return false;
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('sslmode=disable')) {
        return false;
    }
    return { rejectUnauthorized: false };
}

// Check database URL config
async function initDatabase() {
    if (process.env.DATABASE_URL) {
        logger.info('PostgreSQL database URL detected. Initializing database pool...');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: getSslConfig(process.env.DATABASE_URL),
            connectionTimeoutMillis: 15000,
            idleTimeoutMillis: 30000,
            max: 15,
            keepAlive: true
        });

        pool.on('error', (err) => {
            logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
        });

        const maxRetries = 5;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                attempt++;
                const client = await pool.connect();
                logger.info(`PostgreSQL database connected successfully (attempt ${attempt}/${maxRetries}).`);
                
                // Lightweight check: query information_schema for one core table
                const tableCheck = await client.query(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') AS exists"
                );
                if (!tableCheck.rows[0].exists) {
                    logger.warn('Tables not found. Run migration: node scripts/migrate.js');
                }

                client.release();
                useJsonDb = false;
                dbInitError = null;
                return;
            } catch (err) {
                lastError = err;
                logger.warn({ err: err.message, attempt }, `Database initialization attempt ${attempt}/${maxRetries} failed`);
                
                if (attempt < maxRetries) {
                    const delay = 1000 + Math.random() * 1500;
                    logger.info(`Waiting ${Math.round(delay)}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error('All database initialization attempts failed.');
        dbInitError = lastError;
        useJsonDb = false;
    } else {
        if (isVercel) {
            logger.error('DATABASE_URL not set. Required on Vercel.');
            dbInitError = new Error('DATABASE_URL is required on Vercel');
        } else {
            logger.warn('DATABASE_URL not set. Using local JSON database (db.json) fallback.');
            useJsonDb = true;
            initJsonDb();
        }
    }
}

const initPromise = initDatabase();

module.exports = {
    query: (text, params) => {
        if (dbInitError) throw dbInitError;
        const correlationId = getCorrelationId();
        const start = Date.now();
        const qtype = dbQueryType(text);
        inc('dbQueriesTotal', qtype);
        if (useJsonDb) {
            const result = simulateQuery(text, params);
            const duration = Date.now() - start;
            if (duration > 500) {
                inc('dbSlowQueriesTotal');
                logger.warn({ duration, correlationId: correlationId.slice(0, 8), query: text.slice(0, 100) }, 'Slow database query');
            }
            return result;
        }
        return pool.query(text, params).then(result => {
            const duration = Date.now() - start;
            if (duration > 500) {
                inc('dbSlowQueriesTotal');
                logger.warn({ duration, correlationId: correlationId.slice(0, 8), query: text.slice(0, 100) }, 'Slow database query');
            }
            return result;
        }).catch(err => {
            const duration = Date.now() - start;
            inc('dbErrorsTotal');
            logger.error({ err, duration, correlationId: correlationId.slice(0, 8), query: text.slice(0, 100) }, 'Database query failed');
            throw err;
        });
    },
    getClient: async () => {
        if (dbInitError) throw dbInitError;
        if (useJsonDb) return null;
        return pool.connect();
    },
    useJsonDb: () => useJsonDb,
    waitForInit: () => initPromise
};
