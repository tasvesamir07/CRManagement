const whatsappService = require('./whatsapp.service');

describe('WhatsApp Service', () => {
    afterEach(async () => {
        await whatsappService.destroyWhatsApp();
    });

    it('should report status and mock state', () => {
        const status = whatsappService.getStatus();
        expect(status).toBeDefined();
        expect(typeof status.isMock).toBe('boolean');
        expect(status.status).toBeDefined();
    });

    it('should throw error when sending message while disconnected and not in mock mode', async () => {
        if (!whatsappService.isMock()) {
            await expect(whatsappService.sendMessageToGroup('120363000000000000@g.us', 'Test message'))
                .rejects.toThrow('WhatsApp client is not connected');
        } else {
            const res = await whatsappService.sendMessageToGroup('120363000000000000@g.us', 'Test message');
            expect(res.success).toBe(true);
        }
    });

    it('should register and execute WebSocket broadcaster callback', () => {
        let broadcasted = null;
        whatsappService.setWsBroadcaster((data) => {
            broadcasted = data;
        });

        whatsappService.restartWhatsApp();
        expect(broadcasted).toBeDefined();
        expect(broadcasted.type).toBe('whatsapp_status');
    });

    it('should throw error when requesting pairing code without valid phone number', async () => {
        await expect(whatsappService.requestPairingCode('')).rejects.toThrow('Invalid phone number');
    });

    it('should safely clear session and reset status', async () => {
        await expect(whatsappService.clearSession()).resolves.not.toThrow();
        const status = whatsappService.getStatus();
        expect(status.qr).toBe('');
    });

    it('should correctly format Baileys PinInChatMessage content structure', async () => {
        const { generateWAMessage } = require('@whiskeysockets/baileys');
        const key = {
            remoteJid: '12036329481920@g.us',
            fromMe: true,
            id: '3EB0ABC123XYZ'
        };

        const validPinMsg = await generateWAMessage(
            '12036329481920@g.us',
            { pin: key, type: 1, time: 604800 },
            { userJid: '12345@s.whatsapp.net' }
        );

        expect(validPinMsg.message).toBeDefined();
        expect(validPinMsg.message.pinInChatMessage).toBeDefined();
        expect(validPinMsg.message.pinInChatMessage.key).toEqual(key);
        expect(validPinMsg.message.pinInChatMessage.type).toBe(1);
        expect(validPinMsg.message.messageContextInfo.messageAddOnDurationInSecs).toBe(604800);
    });

    it('should safely reject or send when pin options are provided depending on connection state', async () => {
        if (!whatsappService.isMock()) {
            await expect(whatsappService.sendMessageToGroup('12036329481920@g.us', 'Notice to pin', null, { pin: true, pinDuration: 604800 }))
                .rejects.toThrow('WhatsApp client is not connected');
        } else {
            const res = await whatsappService.sendMessageToGroup('12036329481920@g.us', 'Notice to pin', null, { pin: true, pinDuration: 604800 });
            expect(res).toBeDefined();
            expect(res.success).toBe(true);
        }
    });
});
