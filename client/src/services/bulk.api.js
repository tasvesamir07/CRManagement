import api from './http-client';

export const bulkAPI = {
  deleteCourses: async (ids) => {
    const res = await api.post('/bulk/courses/delete', { ids });
    return res.data;
  },
  deletePlatforms: async (ids) => {
    const res = await api.post('/bulk/platforms/delete', { ids });
    return res.data;
  },
  deleteAnnouncements: async (ids) => {
    const res = await api.post('/bulk/announcements/delete', { ids });
    return res.data;
  },
  deleteFiles: async (ids) => {
    const res = await api.post('/bulk/files/delete', { ids });
    return res.data;
  },
  testConnections: async () => {
    const res = await api.post('/bulk/platforms/test-connections');
    return res.data;
  },
  batchCreateRoutines: async (course_id, days) => {
    const res = await api.post('/bulk/routines/batch', { course_id, days });
    return res.data;
  }
};
