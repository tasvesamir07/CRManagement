const db = require('../config/database');
const announcementService = require('./announcement.service');
const whatsappService = require('./whatsapp.service');
const telegramService = require('./telegram.service');

describe('Announcement Service - Partial Broadcast and Edit Support', () => {
    let originalIsMockWhatsapp;
    let originalIsMockTelegram;
    let originalSendMessageWhatsapp;
    let originalSendMessageTelegram;
    let userId;
    let courseId;
    let platformWhatsappId;
    let platformTelegramId;

    beforeAll(async () => {
        await db.waitForInit();

        // Save original methods
        originalIsMockWhatsapp = whatsappService.isMock;
        originalIsMockTelegram = telegramService.isMock;
        originalSendMessageWhatsapp = whatsappService.sendMessageToGroup;
        originalSendMessageTelegram = telegramService.sendMessageToGroup;

        // Override isMock to bypass mock modes check
        whatsappService.isMock = () => false;
        telegramService.isMock = () => false;
    });

    afterAll(() => {
        // Restore original methods
        whatsappService.isMock = originalIsMockWhatsapp;
        telegramService.isMock = originalIsMockTelegram;
        whatsappService.sendMessageToGroup = originalSendMessageWhatsapp;
        telegramService.sendMessageToGroup = originalSendMessageTelegram;
    });

    beforeEach(async () => {
        // Reset DB (simulate clean state)
        if (db.useJsonDb()) {
            const fs = require('fs');
            const path = require('path');
            const dbPath = path.join(__dirname, '../../../db.json');
            const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            parsed.users = [];
            parsed.courses = [];
            parsed.platforms = [];
            parsed.announcements = [];
            parsed.announcement_platforms = [];
            fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2));
        }

        // Insert test user, course, and platforms
        const userRes = await db.query(
            "INSERT INTO users (username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            ['testcr', 'testcr@example.com', 'hash', 'Test CR', 'cr']
        );
        userId = userRes.rows[0].id;

        const courseRes = await db.query(
            "INSERT INTO courses (course_id, course_name, created_by) VALUES ($1, $2, $3) RETURNING id",
            ['CSE-101', 'Intro to CS', userId]
        );
        courseId = courseRes.rows[0].id;

        const waRes = await db.query(
            "INSERT INTO platforms (platform_name, platform_type, chat_id, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            ['WhatsApp Group', 'whatsapp', 'wa-chat-123', true, userId]
        );
        platformWhatsappId = waRes.rows[0].id;

        const tgRes = await db.query(
            "INSERT INTO platforms (platform_name, platform_type, chat_id, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            ['Telegram Group', 'telegram', '-10012345', true, userId]
        );
        platformTelegramId = tgRes.rows[0].id;
    });

    it('should successfully handle partial broadcast success, editing, and retry without duplication', async () => {
        // 1. Create announcement targeted at both WhatsApp and Telegram
        const announcement = await announcementService.createAnnouncement({
            title: 'Test Announcement',
            content: 'Hello CSE-101!',
            category: 'notice',
            course_id: courseId,
            created_by: userId,
            platform_ids: [platformWhatsappId, platformTelegramId]
        });

        expect(announcement).toBeDefined();
        expect(announcement.status).toBe('draft');

        // Check platform links are 'pending'
        const initialDelivery = await db.query(
            'SELECT ap.*, p.platform_name FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1',
            [announcement.id]
        );
        expect(initialDelivery.rows.length).toBe(2);
        expect(initialDelivery.rows.every(d => d.platform_status === 'pending')).toBe(true);

        // 2. Set up services: WhatsApp succeeds, Telegram fails
        whatsappService.sendMessageToGroup = vi.fn().mockResolvedValue({ success: true, messageId: 'wa-msg-1' });
        telegramService.sendMessageToGroup = vi.fn().mockRejectedValue(new Error('Telegram connection failure'));

        // Send announcement
        const sendResult = await announcementService.sendAnnouncement(announcement.id);
        expect(sendResult.successCount).toBe(1);
        expect(sendResult.failureCount).toBe(1);

        // Verify that the announcement status is now 'partial'
        const partialAnn = await announcementService.getAnnouncementById(announcement.id);
        expect(partialAnn.status).toBe('partial');

        // Verify delivery status for each platform
        const midDelivery = await db.query(
            'SELECT ap.*, p.platform_name FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1 ORDER BY ap.platform_id',
            [announcement.id]
        );
        const waDelivery = midDelivery.rows.find(d => d.platform_id === platformWhatsappId);
        const tgDelivery = midDelivery.rows.find(d => d.platform_id === platformTelegramId);

        expect(waDelivery.platform_status).toBe('sent');
        expect(tgDelivery.platform_status).toBe('failed');
        expect(tgDelivery.error_message).toBe('Telegram connection failure');

        // 3. Edit/Update announcement: change content, keep targeted platforms
        // It should keep the 'sent' platform untouched, reset/delete failed ones
        const updated = await announcementService.updateAnnouncement(announcement.id, {
            title: 'Test Announcement (Updated)',
            content: 'Hello CSE-101! Updated Content',
            category: 'notice',
            course_id: courseId,
            platform_ids: [platformWhatsappId, platformTelegramId]
        });

        expect(updated.title).toBe('Test Announcement (Updated)');
        expect(updated.content).toBe('Hello CSE-101! Updated Content');

        // Check announcement_platforms:
        // WhatsApp ('sent') should remain intact.
        // Telegram should be deleted and re-inserted as 'pending'.
        const afterUpdateDelivery = await db.query(
            'SELECT ap.*, p.platform_name FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1 ORDER BY ap.platform_id',
            [announcement.id]
        );
        expect(afterUpdateDelivery.rows.length).toBe(2);
        const waUpdated = afterUpdateDelivery.rows.find(d => d.platform_id === platformWhatsappId);
        const tgUpdated = afterUpdateDelivery.rows.find(d => d.platform_id === platformTelegramId);

        expect(waUpdated.platform_status).toBe('sent');
        expect(tgUpdated.platform_status).toBe('pending');
        expect(tgUpdated.error_message).toBeNull();

        // 4. Retry broadcasting: now Telegram succeeds as well
        whatsappService.sendMessageToGroup = vi.fn().mockResolvedValue({ success: true, messageId: 'wa-msg-2' }); // should be skipped!
        telegramService.sendMessageToGroup = vi.fn().mockResolvedValue({ success: true, messageId: 'tg-msg-1' });

        const retryResult = await announcementService.sendAnnouncement(announcement.id);
        expect(retryResult.successCount).toBe(2); // 1 already sent (skipped but counted as success) + 1 newly sent
        expect(retryResult.failureCount).toBe(0);

        // Verify whatsapp sendMessageToGroup was NOT called on retry (skipped)
        expect(whatsappService.sendMessageToGroup).not.toHaveBeenCalled();
        // Verify telegram sendMessageToGroup WAS called
        expect(telegramService.sendMessageToGroup).toHaveBeenCalled();

        // Verify overall status is now 'sent'
        const finalAnn = await announcementService.getAnnouncementById(announcement.id);
        expect(finalAnn.status).toBe('sent');

        const finalDelivery = await db.query(
            'SELECT ap.*, p.platform_name FROM announcement_platforms ap JOIN platforms p ON ap.platform_id = p.id WHERE ap.announcement_id = $1 ORDER BY ap.platform_id',
            [announcement.id]
        );
        expect(finalDelivery.rows.every(d => d.platform_status === 'sent')).toBe(true);
    });
});
