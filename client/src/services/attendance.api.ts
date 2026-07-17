import api from './http-client';

export const attendanceAPI = {
  list: async (params: { course_id?: number; date?: string; exam_routine_id?: number; page?: number; limit?: number } = {}) => {
    const res = await api.get('/attendance', { params });
    return res.data;
  },
  getByCourseDate: async (courseId: number, date: string, examRoutineId?: number) => {
    const params: any = {};
    if (examRoutineId) params.exam_routine_id = examRoutineId;
    const res = await api.get(`/attendance/course/${courseId}/date/${date}`, { params });
    return res.data;
  },
  getPdf: async (courseId: number, date: string, examRoutineId?: number) => {
    const params: any = {};
    if (examRoutineId) params.exam_routine_id = examRoutineId;
    const res = await api.get(`/attendance/course/${courseId}/date/${date}/pdf`, { params, responseType: 'blob' });
    return res.data;
  },
  bulkMark: async (data: { course_id: number; date: string; exam_routine_id?: number; records: { student_id: number; status: string; notes?: string }[] }) => {
    const res = await api.post('/attendance/bulk', data);
    return res.data;
  },
  update: async (id: number, data: { status?: string; notes?: string }) => {
    const res = await api.put(`/attendance/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/attendance/${id}`);
    return res.data;
  },
  getStudentSummary: async (studentId: number, courseId?: number) => {
    const params: any = {};
    if (courseId) params.course_id = courseId;
    const res = await api.get(`/attendance/student/${studentId}/summary`, { params });
    return res.data;
  }
};
