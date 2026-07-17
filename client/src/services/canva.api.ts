import api from './http-client';

export const canvaAPI = {
  getAuthUrl: async () => {
    const res = await api.get('/canva/auth');
    return res.data;
  },
  getTemplates: async () => {
    const res = await api.get('/canva/templates');
    return res.data;
  },
  saveTemplate: async (data: { name: string; template_type: string; canva_template_id: string; canva_design_id?: string; dataset?: string[] }) => {
    const res = await api.post('/canva/templates', data);
    return res.data;
  },
  getDataset: async (id: number) => {
    const res = await api.get(`/canva/templates/${id}/dataset`);
    return res.data;
  },
  generatePdf: async (data: { template_id: number; data: Record<string, any>; filename?: string }) => {
    const res = await api.post('/canva/generate-pdf', data, { responseType: 'blob' });
    return res.data;
  }
};
