import api from './http-client';

export const adminAPI = {
  listUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  createUser: async (userData: any) => {
    const res = await api.post('/admin/users', userData);
    return res.data;
  },
  updateUser: async (id: number | string, userData: any) => {
    const res = await api.put(`/admin/users/${id}`, userData);
    return res.data;
  },
  deleteUser: async (id: number | string) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  }
};

export const adminAPI_ext = {
  getAuditLogs: async (params: Record<string, any> = {}) => {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  }
};
