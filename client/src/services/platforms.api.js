import api from './http-client';

export const platformsAPI = {
  list: async (courseId) => {
    const params = courseId ? { course_id: courseId } : {};
    const res = await api.get('/platforms', { params });
    return res.data;
  },
  create: async (platformData) => {
    const res = await api.post('/platforms', platformData);
    return res.data;
  },
  update: async (id, platformData) => {
    const res = await api.put(`/platforms/${id}`, platformData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/platforms/${id}`);
    return res.data;
  },
  getWhatsAppStatus: async () => {
    const res = await api.get('/platforms/whatsapp/status');
    return res.data;
  },
  getTelegramStatus: async () => {
    const res = await api.get('/platforms/telegram/status');
    return res.data;
  },
  getMessengerStatus: async () => {
    const res = await api.get('/platforms/messenger/status');
    return res.data;
  },
  getWhatsAppGroups: async () => {
    const res = await api.get('/platforms/whatsapp/groups');
    return res.data;
  },
  restartWhatsApp: async () => {
    const res = await api.post('/platforms/whatsapp/restart');
    return res.data;
  },
  clearWhatsAppSession: async () => {
    const res = await api.post('/platforms/whatsapp/clear-session');
    return res.data;
  },
  pairWhatsApp: async (phoneNumber) => {
    const res = await api.post('/platforms/whatsapp/pair', { phoneNumber });
    return res.data;
  },
  saveMessengerAppState: async (appstate) => {
    const res = await api.post('/platforms/messenger/appstate', { appstate });
    return res.data;
  }
};
