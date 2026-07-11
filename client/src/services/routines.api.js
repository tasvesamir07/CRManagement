import api from './http-client';

export const routinesAPI = {
  list: async (courseId = '') => {
    const res = await api.get('/routines', { params: { course_id: courseId } });
    return res.data;
  },
  create: async (routineData) => {
    const res = await api.post('/routines', routineData);
    return res.data;
  },
  update: async (id, routineData) => {
    const res = await api.put(`/routines/${id}`, routineData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/routines/${id}`);
    return res.data;
  }
};
