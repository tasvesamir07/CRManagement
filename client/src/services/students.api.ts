import api from './http-client';

export const studentsAPI = {
  list: async (params: { course_id?: number | string; search?: string; page?: number; limit?: number } = {}) => {
    const res = await api.get('/students', { params });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get(`/students/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/students', data);
    return res.data;
  },
  update: async (id: number, data: any) => {
    const res = await api.put(`/students/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },
  bulkImport: async (data: { students: any[]; course_ids?: number[]; enroll_all?: boolean }) => {
    const res = await api.post('/students/bulk', data);
    return res.data;
  },
  enrollCourses: async (id: number, courseIds: number[]) => {
    const res = await api.post(`/students/${id}/courses`, { course_ids: courseIds });
    return res.data;
  },
  enrollAllCourses: async (id: number) => {
    const res = await api.post(`/students/${id}/courses/all`);
    return res.data;
  },
  removeCourse: async (id: number, courseId: number) => {
    const res = await api.delete(`/students/${id}/courses/${courseId}`);
    return res.data;
  },
  getCourses: async (id: number) => {
    const res = await api.get(`/students/${id}/courses`);
    return res.data;
  }
};
