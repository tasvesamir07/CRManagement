import api from './http-client';

export const logsAPI = {
  list: async (params = {}) => {
    const res = await api.get('/logs', { params });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/logs/${id}`);
    return res.data;
  },
  clear: async () => {
    const res = await api.delete('/logs');
    return res.data;
  }
};
