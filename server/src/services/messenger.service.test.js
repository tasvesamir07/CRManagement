const db = require('../config/database');

describe('Messenger Service', () => {
  beforeAll(async () => {
    await db.waitForInit();
  });

  beforeEach(() => {
    delete require.cache[require.resolve('./messenger.service')];
  });

  it('should run in mock mode when no appState is found in DB/env/file', async () => {
    const messengerService = require('./messenger.service');
    await messengerService.initMessenger();
    expect(messengerService.isMock()).toBe(true);
  });

  it('should send messages in mock mode', async () => {
    const messengerService = require('./messenger.service');
    await messengerService.initMessenger();

    const result = await messengerService.sendMessageToGroup('123456789', 'Test message');

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^mock-msg-id-/);
  });

  it('should send messages with attachments in mock mode', async () => {
    const messengerService = require('./messenger.service');
    await messengerService.initMessenger();

    const result = await messengerService.sendMessageToGroup('123456789', 'Test message', [
      { path: 'test.txt', originalName: 'test.txt' }
    ]);

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^mock-msg-id-/);
  });
});
