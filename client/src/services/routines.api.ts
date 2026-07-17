import api from './http-client';

export const routinesAPI = {
  list: async (courseId: number | string = '') => {
    const res = await api.get('/routines', { params: { course_id: String(courseId) } });
    return res.data;
  },
  create: async (routineData: any) => {
    const res = await api.post('/routines', routineData);
    return res.data;
  },
  update: async (id: number | string, routineData: any) => {
    const res = await api.put(`/routines/${id}`, routineData);
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete(`/routines/${id}`);
    return res.data;
  }
};
