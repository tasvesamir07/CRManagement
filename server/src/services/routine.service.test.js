const db = require('../config/database');

const routineService = require('./routine.service');

describe('Routine Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createRoutine', () => {
    it('should create a routine', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({
        rows: [{ id: 1, course_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', room_number: '101', section: 'A' }]
      });
      const result = await routineService.createRoutine({
        course_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', room_number: '101', section: 'A'
      });
      expect(result.id).toBe(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should default section to empty string', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      await routineService.createRoutine({
        course_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', room_number: '101'
      });
      expect(spy.mock.calls[0][1][5]).toBe('');
    });
  });

  describe('getRoutines', () => {
    it('should return all routines', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, c_id: 'CSE101', course_name: 'CS 101', day_of_week: 'Monday' }] });
      const result = await routineService.getRoutines();
      expect(result).toHaveLength(1);
    });

    it('should filter by courseId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await routineService.getRoutines(1);
      expect(spy.mock.calls[0][1]).toContain(1);
    });

    it('should filter by userId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await routineService.getRoutines(null, 5);
      expect(spy.mock.calls[0][1]).toContain(5);
    });
  });

  describe('updateRoutine', () => {
    it('should update a routine', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, day_of_week: 'Tuesday' }] });
      const result = await routineService.updateRoutine(1, {
        course_id: 1, day_of_week: 'Tuesday', start_time: '10:00', end_time: '11:00', room_number: '202', section: 'B'
      });
      expect(result.day_of_week).toBe('Tuesday');
    });
  });

  describe('deleteRoutine', () => {
    it('should delete a routine', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await routineService.deleteRoutine(1);
      expect(result.id).toBe(1);
    });
  });
});
