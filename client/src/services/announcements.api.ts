import api from './http-client';

export const announcementsAPI = {
  list: async (params: Record<string, any> = {}) => {
    const res = await api.get('/announcements', { params });
    return res.data;
  },
  get: async (id: string | undefined) => {
    if (!id) throw new Error('Announcement ID is required');
    const res = await api.get(`/announcements/${id}`);
    return res.data;
  },
  create: async (announcementData: any) => {
    const res = await api.post('/announcements', announcementData);
    return res.data;
  },
  update: async (id: number | string, announcementData: any) => {
    const res = await api.put(`/announcements/${id}`, announcementData);
    return res.data;
  },
  send: async (id: number | string, data: any = { confirmed: true }) => {
    const res = await api.post(`/announcements/${id}/send`, data);
    return res.data;
  },
  schedule: async (id: number | string, scheduledAt: string) => {
    const res = await api.post(`/announcements/${id}/schedule`, { scheduled_at: scheduledAt });
    return res.data;
  },
  draftAI: async (prompt: string, category: string | null = null) => {
    const res = await api.post('/announcements/draft-ai', { prompt, category });
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete(`/announcements/${id}`);
    return res.data;
  }
};
