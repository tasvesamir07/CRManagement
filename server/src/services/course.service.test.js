const db = require('../config/database');
const cache = require('../config/cache');

const courseService = require('./course.service');

describe('Course Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course and assign creator as lead', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, course_id: 'CSE101', course_name: 'CS 101' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      vi.spyOn(cache, 'invalidatePattern').mockReturnValue(undefined);

      const result = await courseService.createCourse({
        course_id: 'CSE101', course_name: 'CS 101', teacher_name: 'Dr. Smith', teacher_initials: 'DS', created_by: 1
      });
      expect(result.course_id).toBe('CSE101');
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should sanitize course_id to uppercase', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, course_id: 'CSE101' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      vi.spyOn(cache, 'invalidatePattern').mockReturnValue(undefined);

      await courseService.createCourse({ course_id: 'cse101', course_name: 'CS 101', created_by: 1 });
      expect(spy.mock.calls[0][1][0]).toBe('CSE101');
    });
  });

  describe('getCourses', () => {
    it('should return courses for a user', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, course_id: 'CSE101' }] });
      spy.mockResolvedValueOnce({ rows: [{ course_id: 1, count: 5 }] });
      vi.spyOn(cache, 'get').mockReturnValue(null);
      vi.spyOn(cache, 'set').mockReturnValue(undefined);

      const result = await courseService.getCourses(1);
      expect(result).toHaveLength(1);
      expect(result[0].member_count).toBe(5);
    });

    it('should return all courses when no userId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] });
      vi.spyOn(cache, 'get').mockReturnValue(null);
      vi.spyOn(cache, 'set').mockReturnValue(undefined);

      const result = await courseService.getCourses();
      expect(result).toEqual([]);
      expect(spy.mock.calls[0][0]).not.toContain('course_members');
    });

    it('should use cache if available', async () => {
      vi.spyOn(cache, 'get').mockReturnValue([{ id: 1, course_id: 'CSE101' }]);
      const spy = vi.spyOn(db, 'query');

      const result = await courseService.getCourses(1);
      expect(result).toHaveLength(1);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getCourseById', () => {
    it('should return a course with routines', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1, course_id: 'CSE101', course_name: 'CS 101' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, day_of_week: 'Monday' }] });
      const result = await courseService.getCourseById(1);
      expect(result.course_id).toBe('CSE101');
      expect(result.routines).toHaveLength(1);
    });

    it('should return null if not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      const result = await courseService.getCourseById(999);
      expect(result).toBeNull();
    });
  });

  describe('setDefaultPlatforms', () => {
    it('should validate and update platforms', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, default_platform_ids: [1, 2] }] });
      vi.spyOn(cache, 'invalidatePattern').mockReturnValue(undefined);

      const result = await courseService.setDefaultPlatforms(1, [1, 2]);
      expect(result.default_platform_ids).toEqual([1, 2]);
    });

    it('should throw if some platforms are invalid', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      await expect(courseService.setDefaultPlatforms(1, [1, 999])).rejects.toThrow('One or more platforms not found or inactive');
    });

    it('should throw if course not found', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      spy.mockResolvedValueOnce({ rows: [] });
      await expect(courseService.setDefaultPlatforms(999, [1])).rejects.toThrow('Course not found');
    });
  });

  describe('updateCourse', () => {
    it('should update course fields', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, course_name: 'Updated' }] });
      vi.spyOn(cache, 'invalidatePattern').mockReturnValue(undefined);
      const result = await courseService.updateCourse(1, {
        course_id: 'CSE101', course_name: 'Updated', teacher_name: 'Dr. Smith', teacher_initials: 'DS', default_platform_ids: [1]
      });
      expect(result.course_name).toBe('Updated');
    });
  });

  describe('deleteCourse', () => {
    it('should soft-delete a course', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      vi.spyOn(cache, 'invalidatePattern').mockReturnValue(undefined);
      const result = await courseService.deleteCourse(1);
      expect(result.id).toBe(1);
    });
  });

  describe('getMembers', () => {
    it('should return course members', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, username: 'user1', role: 'lead' }] });
      const result = await courseService.getMembers(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('assignMember', () => {
    it('should assign a member to a course', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, user_id: 1, course_id: 1, role: 'cr' }] });
      vi.spyOn(cache, 'invalidatePattern').mockReturnValue(undefined);
      const result = await courseService.assignMember(1, 1, 'cr');
      expect(result.role).toBe('cr');
    });
  });

  describe('removeMember', () => {
    it('should remove a member from a course', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      vi.spyOn(cache, 'invalidatePattern').mockReturnValue(undefined);
      const result = await courseService.removeMember(1, 1);
      expect(result.id).toBe(1);
    });
  });
});
