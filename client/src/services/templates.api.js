import api from './http-client';

export const templatesAPI = {
  list: async () => {
    const res = await api.get('/templates');
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/templates/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/templates', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/templates/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/templates/${id}`);
    return res.data;
  }
};
