import api from './http-client';

export const coursesAPI = {
  list: async () => {
    const res = await api.get('/courses');
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  },
  create: async (courseData) => {
    const res = await api.post('/courses', courseData);
    return res.data;
  },
  update: async (id, courseData) => {
    const res = await api.put(`/courses/${id}`, courseData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/courses/${id}`);
    return res.data;
  },
  getMembers: async (courseId) => {
    const res = await api.get(`/courses/${courseId}/members`);
    return res.data;
  },
  assignMember: async (courseId, userId, role = 'cr') => {
    const res = await api.post(`/courses/${courseId}/members`, { userId, role });
    return res.data;
  },
  removeMember: async (courseId, userId) => {
    const res = await api.delete(`/courses/${courseId}/members/${userId}`);
    return res.data;
  },
  setDefaultPlatforms: async (courseId, platformIds) => {
    const res = await api.put(`/courses/${courseId}/default-platforms`, { platform_ids: platformIds });
    return res.data;
  }
};
