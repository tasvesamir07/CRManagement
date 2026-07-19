const db = require('../config/database');

const examRoutineService = require('./examRoutine.service');

describe('ExamRoutine Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getExamRoutines', () => {
    it('should return all exam routines', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, exam_type: 'midterm', course_id: 'CSE101', course_name: 'CS 101' }] });
      const result = await examRoutineService.getExamRoutines();
      expect(result).toHaveLength(1);
    });

    it('should filter by courseId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await examRoutineService.getExamRoutines(1);
      expect(spy.mock.calls[0][0]).toContain('er.course_id = $1');
    });

    it('should filter by examType', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await examRoutineService.getExamRoutines(null, 'final');
      expect(spy.mock.calls[0][0]).toContain('er.exam_type = $1');
    });

    it('should filter by date range', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await examRoutineService.getExamRoutines(null, null, '2026-01-01', '2026-12-31');
      const query = spy.mock.calls[0][0];
      expect(query).toContain('er.exam_date >=');
      expect(query).toContain('er.exam_date <=');
    });

    it('should filter by userId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await examRoutineService.getExamRoutines(null, null, null, null, 1);
      expect(spy.mock.calls[0][0]).toContain('course_members WHERE user_id');
    });
  });

  describe('getExamRoutineById', () => {
    it('should return an exam routine by id', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, exam_type: 'final' }] });
      const result = await examRoutineService.getExamRoutineById(1);
      expect(result.id).toBe(1);
    });

    it('should return undefined if not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      const result = await examRoutineService.getExamRoutineById(999);
      expect(result).toBeUndefined();
    });
  });

  describe('createExamRoutine', () => {
    it('should create an exam routine', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, exam_type: 'midterm' }] });
      const result = await examRoutineService.createExamRoutine({
        course_id: 1, exam_type: 'midterm', exam_date: '2026-06-15', start_time: '09:00', end_time: '11:00'
      });
      expect(result.id).toBe(1);
    });
  });

  describe('updateExamRoutine', () => {
    it('should update specified fields', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, exam_type: 'final' }] });
      const result = await examRoutineService.updateExamRoutine(1, { exam_type: 'final' });
      expect(result.exam_type).toBe('final');
    });

    it('should handle updating all fields', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      await examRoutineService.updateExamRoutine(1, {
        course_id: 1, exam_type: 'final', exam_date: '2026-07-01', start_time: '10:00',
        end_time: '12:00', room_number: '201', section: 'A', instructions: 'Open book', canva_template_id: 'tpl_1', is_active: true
      });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('deleteExamRoutine', () => {
    it('should soft-delete an exam routine', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await examRoutineService.deleteExamRoutine(1);
      expect(result.id).toBe(1);
    });
  });
});
