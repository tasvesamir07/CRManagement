import api from './http-client';

export const coursesAPI = {
  list: async () => {
    const res = await api.get('/courses');
    return res.data;
  },
  get: async (id: number | string) => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  },
  create: async (courseData: any) => {
    const res = await api.post('/courses', courseData);
    return res.data;
  },
  update: async (id: number | string, courseData: any) => {
    const res = await api.put(`/courses/${id}`, courseData);
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete(`/courses/${id}`);
    return res.data;
  },
  getMembers: async (courseId: number | string) => {
    const res = await api.get(`/courses/${courseId}/members`);
    return res.data;
  },
  assignMember: async (courseId: number | string, userId: string, role: string = 'cr') => {
    const res = await api.post(`/courses/${courseId}/members`, { userId, role });
    return res.data;
  },
  removeMember: async (courseId: number | string, userId: string) => {
    const res = await api.delete(`/courses/${courseId}/members/${userId}`);
    return res.data;
  },
  setDefaultPlatforms: async (courseId: number | string, platformIds: string[]) => {
    const res = await api.put(`/courses/${courseId}/default-platforms`, { platform_ids: platformIds });
    return res.data;
  }
};
