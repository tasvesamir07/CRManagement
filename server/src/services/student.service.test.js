const db = require('../config/database');

const studentService = require('./student.service');

describe('Student Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sortStudentIds', () => {
    it('should sort numeric IDs before alphanumeric', () => {
      const students = [{ student_id: 'B001' }, { student_id: '101' }, { student_id: 'A001' }, { student_id: '102' }];
      const sorted = studentService.sortStudentIds(students);
      expect(sorted[0].student_id).toBe('101');
      expect(sorted[1].student_id).toBe('102');
    });
  });

  describe('getStudents', () => {
    it('should return paginated students', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1, student_id: 'S001', name: 'Alice' }] });
      const result = await studentService.getStudents();
      expect(result.total).toBe(2);
      expect(result.rows).toHaveLength(1);
    });

    it('should filter by courseId', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      spy.mockResolvedValueOnce({ rows: [] });
      await studentService.getStudents(1);
      expect(spy.mock.calls[0][0]).toContain('student_courses');
    });

    it('should search by student_id or name', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await studentService.getStudents(null, 'Alice');
      expect(spy.mock.calls[0][0]).toContain('ILIKE');
    });
  });

  describe('getStudentById', () => {
    it('should return a student by id', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, student_id: 'S001', name: 'Alice' }] });
      const result = await studentService.getStudentById(1);
      expect(result.name).toBe('Alice');
    });

    it('should return null if not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      const result = await studentService.getStudentById(999);
      expect(result).toBeNull();
    });
  });

  describe('getStudentByStudentId', () => {
    it('should return a student by student_id string', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, student_id: 'S001' }] });
      const result = await studentService.getStudentByStudentId('S001');
      expect(result.student_id).toBe('S001');
    });
  });

  describe('createStudent', () => {
    it('should create a student', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, student_id: 'S001', name: 'Alice' }] });
      const result = await studentService.createStudent({
        student_id: 'S001', name: 'Alice', email: 'alice@test.com', phone: '1234567890', batch: '2026', section: 'A'
      });
      expect(result.student_id).toBe('S001');
    });

    it('should trim all fields', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      await studentService.createStudent({
        student_id: '  S001  ', name: '  Alice  ', email: '  a@b.com  ', phone: '  123  ', batch: '  2026  ', section: '  A  '
      });
      const params = spy.mock.calls[0][1];
      expect(params[0]).toBe('S001');
      expect(params[1]).toBe('Alice');
    });
  });

  describe('updateStudent', () => {
    it('should update a student', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, name: 'Updated' }] });
      const result = await studentService.updateStudent(1, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should handle is_active field', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      await studentService.updateStudent(1, { student_id: 'S001', name: 'A', email: 'a@b.com', phone: '123', batch: '2026', section: 'A', is_active: false });
      expect(spy.mock.calls[0][0]).toContain('is_active=');
    });
  });

  describe('deleteStudent', () => {
    it('should soft-delete a student', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await studentService.deleteStudent(1);
      expect(result.id).toBe(1);
    });
  });

  describe('bulkImportStudents', () => {
    it('should import multiple students', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await studentService.bulkImportStudents({
        students: [
          { student_id: 'S001', name: 'Alice' },
          { student_id: 'S002', name: 'Bob' }
        ]
      });
      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should enroll in all courses when enroll_all is true', async () => {
      const spy = vi.spyOn(db, 'query');
      spy.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      spy.mockResolvedValueOnce({ rows: [{ id: 10 }, { id: 20 }] });
      const result = await studentService.bulkImportStudents({
        students: [{ student_id: 'S001', name: 'Alice' }], enroll_all: true
      });
      expect(result.created).toHaveLength(1);
    });
  });

  describe('enrollStudent', () => {
    it('should enroll a student in courses', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, student_id: 1, course_id: 1 }] });
      const result = await studentService.enrollStudent(1, [1, 2]);
      expect(result).toHaveLength(2);
    });
  });

  describe('removeStudentFromCourse', () => {
    it('should remove enrollment', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await studentService.removeStudentFromCourse(1, 1);
      expect(result.id).toBe(1);
    });
  });

  describe('getStudentCourses', () => {
    it('should return courses for a student', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, course_id: 'CSE101' }] });
      const result = await studentService.getStudentCourses(1);
      expect(result).toHaveLength(1);
    });
  });
});
