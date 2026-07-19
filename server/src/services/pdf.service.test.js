const db = require('../config/database');

const pdfService = require('./pdf.service');

describe('PDF Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatDate', () => {
    it('should format a date string', () => {
      const result = pdfService.formatDate('2026-07-20');
      expect(result).toMatch(/\d{2} \w{3} \d{4}/);
    });
  });

  describe('getPresentStudents', () => {
    it('should return sorted present students', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, student_id: 'S002', name: 'Bob' }, { id: 2, student_id: 'S001', name: 'Alice' }] });
      spy.mockResolvedValueOnce({ rows: [{ student_id: 1 }, { student_id: 2 }] });
      const result = await pdfService.getPresentStudents(1, '2026-07-01');
      expect(result).toHaveLength(2);
      expect(result[0].student_id).toBe('S001');
    });

    it('should filter by examRoutineId', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, student_id: 'S001', name: 'Alice' }] });
      spy.mockResolvedValueOnce({ rows: [{ student_id: 1 }] });
      await pdfService.getPresentStudents(1, '2026-07-01', 5);
      expect(spy.mock.calls[1][0]).toContain('exam_routine_id = $4');
    });
  });

  describe('generateAttendancePdf', () => {
    it('should generate a PDF buffer', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, course_id: 'CSE101', course_name: 'CS 101' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, student_id: 'S001', name: 'Alice' }] });
      spy.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      spy.mockResolvedValueOnce({ rows: [{ section: 'A' }] });

      const buffer = await pdfService.generateAttendancePdf(1, '2026-07-01');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw if course not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await expect(pdfService.generateAttendancePdf(999, '2026-07-01')).rejects.toThrow('Course not found');
    });

    it('should handle examRoutineId path', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, course_id: 'CSE101', course_name: 'CS 101' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, student_id: 'S001', name: 'Alice' }] });
      spy.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      spy.mockResolvedValueOnce({ rows: [{ section: 'B' }] });

      const buffer = await pdfService.generateAttendancePdf(1, '2026-07-01', 5);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });
});
