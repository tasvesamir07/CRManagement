describe('Telegram Service', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('./telegram.service')];
  });

  it('should be in mock mode when TELEGRAM_BOT_TOKEN is not set', () => {
    const telegramService = require('./telegram.service');
    telegramService.initTelegram();
    expect(telegramService.isMock()).toBe(true);
  });

  it('should send messages in mock mode', async () => {
    const telegramService = require('./telegram.service');
    telegramService.initTelegram();

    const result = await telegramService.sendMessageToGroup('-100123456789', 'Test message');

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^mock-tg-id-/);
  });

  it('should handle chat IDs with thread IDs', async () => {
    const telegramService = require('./telegram.service');
    telegramService.initTelegram();

    const result = await telegramService.sendMessageToGroup('-100123456789/45', 'Test with thread');

    expect(result.success).toBe(true);
  });
});
