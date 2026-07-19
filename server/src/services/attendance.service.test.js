const db = require('../config/database');

const attendanceService = require('./attendance.service');

describe('Attendance Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAttendance', () => {
    it('should return paginated attendance', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, student_id: 'S001', name: 'Alice', status: 'present' }] });
      const result = await attendanceService.getAttendance(1, '2026-07-01');
      expect(result.total).toBe(3);
      expect(result.rows).toHaveLength(1);
    });

    it('should filter by examRoutineId', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      spy.mockResolvedValueOnce({ rows: [] });
      await attendanceService.getAttendance(1, '2026-07-01', 5);
      expect(spy.mock.calls[0][0]).toContain('exam_routine_id');
    });
  });

  describe('bulkMarkAttendance', () => {
    it('should insert new attendance records', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, status: 'present' }] });
      const result = await attendanceService.bulkMarkAttendance({
        course_id: 1, date: '2026-07-01', records: [{ student_id: 1, status: 'present' }]
      }, 5);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('present');
    });

    it('should update existing attendance records', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 10 }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 10, status: 'absent' }] });
      const result = await attendanceService.bulkMarkAttendance({
        course_id: 1, date: '2026-07-01', records: [{ student_id: 1, status: 'absent' }]
      }, 5);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('absent');
    });
  });

  describe('getAttendanceSummary', () => {
    it('should calculate attendance percentage', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ total: 10, present: 7 }] });
      const result = await attendanceService.getAttendanceSummary(1);
      expect(result.total).toBe(10);
      expect(result.present).toBe(7);
      expect(result.percentage).toBe(70);
    });

    it('should handle zero total', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ total: 0, present: 0 }] });
      const result = await attendanceService.getAttendanceSummary(1);
      expect(result.percentage).toBe(0);
    });

    it('should filter by courseId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ total: 5, present: 5 }] });
      await attendanceService.getAttendanceSummary(1, 2);
      expect(spy.mock.calls[0][0]).toContain('course_id = $2');
    });
  });
});
