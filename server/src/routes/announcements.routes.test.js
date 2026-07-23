const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const announcementsRouter = require('./announcements.routes');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

function generateToken(user = { id: 1, username: 'testcr', role: 'cr' }) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

describe('Announcements Routes API', () => {
    let server;
    let baseUrl;
    let token;

    beforeAll(async () => {
        await db.waitForInit();
        const app = express();
        app.use(express.json());
        app.use('/api/announcements', announcementsRouter);

        await new Promise((resolve) => {
            server = http.createServer(app).listen(0, '127.0.0.1', () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}/api/announcements`;
                resolve();
            });
        });

        token = generateToken();
    });

    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('should reject unauthenticated requests with 401', async () => {
        const res = await fetch(baseUrl);
        expect(res.status).toBe(401);
    });

    it('should list announcements for authenticated user', async () => {
        const res = await fetch(baseUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toBeDefined();
        expect(Array.isArray(data.announcements)).toBe(true);
    });

    it('should create a new announcement draft', async () => {
        const payload = {
            title: 'Test Announcement Title',
            content: 'Test content for announcement route test',
            category: 'general'
        };

        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        expect(data.title).toBe('Test Announcement Title');
    });

    it('should generate fallback AI draft when GEMINI_API_KEY is not set', async () => {
        const payload = {
            prompt: 'Class canceled tomorrow',
            category: 'notice'
        };

        const res = await fetch(`${baseUrl}/draft-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.draft).toBeDefined();
        expect(data.draft).toContain('Notice: NOTICE');
    });

    it('should get announcement details by ID or return 404 for nonexistent ID', async () => {
        const res = await fetch(`${baseUrl}/999999`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(res.status === 404 || res.status === 200).toBe(true);
    });

    it('should validate request body on creation', async () => {
        const invalidPayload = {
            title: '' // invalid empty title
        };

        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(invalidPayload)
        });

        expect(res.status).toBe(400);
    });

    it('should require confirmation for immediate broadcast endpoint', async () => {
        const res = await fetch(`${baseUrl}/1/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ confirmed: false })
        });

        expect(res.status).toBe(400);
    });
});
