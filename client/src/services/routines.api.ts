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
  },
  getSettings: async () => {
    const res = await api.get('/routines/settings');
    return res.data;
  },
  saveSettings: async (settings: any) => {
    const res = await api.post('/routines/settings', { settings });
    return res.data;
  },
  moveRoutine: async (routineId: number | string, targetFolderId: string) => {
    const res = await api.post(`/routines/${routineId}/move`, { targetFolderId });
    return res.data;
  },
  copyRoutine: async (routineId: number | string, targetFolderId: string) => {
    const res = await api.post(`/routines/${routineId}/copy`, { targetFolderId });
    return res.data;
  },
  listFolders: async (options?: { signal?: AbortSignal }) => {
    const res = await api.get('/routines/folders', { signal: options?.signal });
    return res.data;
  }
};
