import api from './http-client';

export const announcementsAPI = {
  list: async (params = {}) => {
    const res = await api.get('/announcements', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/announcements/${id}`);
    return res.data;
  },
  create: async (announcementData) => {
    const res = await api.post('/announcements', announcementData);
    return res.data;
  },
  update: async (id, announcementData) => {
    const res = await api.put(`/announcements/${id}`, announcementData);
    return res.data;
  },
  send: async (id, data = { confirmed: true }) => {
    const res = await api.post(`/announcements/${id}/send`, data);
    return res.data;
  },
  schedule: async (id, scheduledAt) => {
    const res = await api.post(`/announcements/${id}/schedule`, { scheduled_at: scheduledAt });
    return res.data;
  },
  draftAI: async (prompt, category = null) => {
    const res = await api.post('/announcements/draft-ai', { prompt, category });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/announcements/${id}`);
    return res.data;
  }
};
