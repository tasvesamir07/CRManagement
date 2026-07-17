import api from './http-client';

export const examRoutinesAPI = {
  list: async (params: { course_id?: number | string; exam_type?: string; date_from?: string; date_to?: string } = {}) => {
    const res = await api.get('/exam-routines', { params });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get(`/exam-routines/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/exam-routines', data);
    return res.data;
  },
  update: async (id: number, data: any) => {
    const res = await api.put(`/exam-routines/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/exam-routines/${id}`);
    return res.data;
  }
};
