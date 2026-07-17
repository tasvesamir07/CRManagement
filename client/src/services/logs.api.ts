import api from './http-client';

export const logsAPI = {
  list: async (params: Record<string, any> = {}) => {
    const res = await api.get('/logs', { params });
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete(`/logs/${id}`);
    return res.data;
  },
  clear: async () => {
    const res = await api.delete('/logs');
    return res.data;
  }
};
