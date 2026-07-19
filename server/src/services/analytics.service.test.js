const db = require('../config/database');

const analyticsService = require('./analytics.service');

describe('Analytics Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('track', () => {
    it('should insert an analytics event', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await analyticsService.track('announcement.view', 1, { announcement_id: 5 });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_events'),
        ['announcement.view', 1, JSON.stringify({ announcement_id: 5 })]
      );
    });

    it('should handle null userId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await analyticsService.track('page.view');
      const params = spy.mock.calls[0][1];
      expect(params[1]).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(db, 'query').mockRejectedValue(new Error('DB error'));
      await expect(analyticsService.track('test')).resolves.toBeUndefined();
    });
  });

  describe('getDashboardStats', () => {
    it('should return all dashboard stats', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '10' }] });
      spy.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      spy.mockResolvedValueOnce({ rows: [{ count: '100' }] });
      spy.mockResolvedValueOnce({ rows: [{ count: '60' }] });
      spy.mockResolvedValueOnce({ rows: [{ count: '10' }] });
      spy.mockResolvedValueOnce({ rows: [{ date: '2026-07-01', count: 5 }] });
      spy.mockResolvedValueOnce({ rows: [{ platform_type: 'whatsapp', platform_name: 'WA', platform_status: 'sent', count: 50 }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, username: 'admin', display_name: 'Admin', announcement_count: 20 }] });

      const stats = await analyticsService.getDashboardStats();
      expect(stats.totalUsers).toBe(10);
      expect(stats.totalCourses).toBe(5);
      expect(stats.totalAnnouncements).toBe(100);
      expect(stats.sentAnnouncements).toBe(60);
      expect(stats.scheduledAnnouncements).toBe(10);
      expect(stats.announcementsPerDay).toHaveLength(1);
      expect(stats.deliveryStats).toHaveLength(1);
      expect(stats.topUsers).toHaveLength(1);
    });

    it('should handle zero counts', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockImplementation((queryText) => {
        if (queryText.includes('DATE(created_at)')) return Promise.resolve({ rows: [] });
        if (queryText.includes('GROUP BY')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [{ count: '0' }] });
      });

      const stats = await analyticsService.getDashboardStats();
      expect(stats.totalUsers).toBe(0);
      expect(stats.announcementsPerDay).toEqual([]);
      expect(stats.deliveryStats).toEqual([]);
      expect(stats.topUsers).toEqual([]);
    });
  });
});
