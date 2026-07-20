const db = require('../config/database');

const auditService = require('./audit.service');

describe('Audit Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should insert an audit log entry', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await auditService.log(1, 'user.login');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [1, 'user.login', null, null, null, null]
      );
    });

    it('should stringify details when provided', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await auditService.log(1, 'announcement.created', 'announcement', 5, { title: 'Test' });
      const params = spy.mock.calls[0][1];
      expect(params[4]).toBe(JSON.stringify({ title: 'Test' }));
    });

    it('should handle errors gracefully without throwing', async () => {
      vi.spyOn(db, 'query').mockRejectedValue(new Error('DB error'));
      await expect(auditService.log(1, 'test')).resolves.toBeUndefined();
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, action: 'user.login', username: 'admin', display_name: 'Admin' }] });

      const result = await auditService.getLogs({ page: 1, limit: 10 });
      expect(result.logs).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by userId', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      spy.mockResolvedValueOnce({ rows: [] });
      await auditService.getLogs({ userId: 1 });
      expect(spy.mock.calls[0][0]).toContain('user_id = $1');
    });

    it('should filter by action', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      spy.mockResolvedValueOnce({ rows: [] });
      await auditService.getLogs({ action: 'user.login' });
      expect(spy.mock.calls[0][0]).toContain('action = $1');
    });

    it('should filter by entityType', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      spy.mockResolvedValueOnce({ rows: [] });
      await auditService.getLogs({ entityType: 'announcement' });
      expect(spy.mock.calls[0][0]).toContain('entity_type = $1');
    });
  });

  describe('deleteLog', () => {
    it('should delete a log by id', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await auditService.deleteLog(1);
      expect(result).toBe(true);
    });

    it('should delete a log by id and userId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await auditService.deleteLog(1, 5);
      expect(result).toBe(true);
      expect(spy.mock.calls[0][0]).toContain('user_id = $2');
    });

    it('should return false if log not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      const result = await auditService.deleteLog(999);
      expect(result).toBe(false);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await auditService.clearLogs();
      expect(spy.mock.calls[0][0]).toBe('DELETE FROM audit_logs');
    });

    it('should clear logs for a specific user', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await auditService.clearLogs(1);
      expect(spy.mock.calls[0][0]).toContain('WHERE user_id');
    });
  });
});
