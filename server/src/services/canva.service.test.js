process.env.CANVA_CLIENT_ID = 'test-client-id';
process.env.CANVA_CLIENT_SECRET = 'test-secret';
process.env.CANVA_REDIRECT_URI = 'http://localhost/callback';

const canvaService = require('./canva.service');

describe('Canva Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should generate an OAuth URL', () => {
      const url = canvaService.getAuthUrl('state123');
      expect(url).toContain('https://www.canva.com/api/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=state123');
    });
  });

  describe('exchangeCode', () => {
    it('should return null on API error', async () => {
      vi.spyOn(canvaService, '_request').mockResolvedValue(null);
      const result = await canvaService.exchangeCode('bad-code');
      expect(result).toBeNull();
    });

    it('should return tokens on success', async () => {
      vi.spyOn(canvaService, '_request').mockResolvedValue({ access_token: 'tok-123' });
      const result = await canvaService.exchangeCode('valid-code');
      expect(result.access_token).toBe('tok-123');
    });
  });

  describe('refreshAccessToken', () => {
    it('should add expires_at', async () => {
      vi.spyOn(canvaService, '_request').mockResolvedValue({ access_token: 'new-tok', expires_in: 3600 });
      const result = await canvaService.refreshAccessToken('refresh-tok');
      expect(result.access_token).toBe('new-tok');
      expect(result.expires_at).toBeGreaterThan(Date.now());
    });
  });

  describe('getBrandTemplates', () => {
    it('should call API and return results', async () => {
      vi.spyOn(canvaService, '_request').mockResolvedValue({ items: [] });
      const result = await canvaService.getBrandTemplates('tok');
      expect(result.items).toEqual([]);
    });
  });

  describe('getTemplateDataset', () => {
    it('should call API and return dataset', async () => {
      vi.spyOn(canvaService, '_request').mockResolvedValue({ dataset: ['field1'] });
      const result = await canvaService.getTemplateDataset('tok', 'tpl_1');
      expect(result.dataset).toEqual(['field1']);
    });
  });

  describe('createAutofillJob', () => {
    it('should call API and return job', async () => {
      vi.spyOn(canvaService, '_request').mockResolvedValue({ job: { id: 'job_1' } });
      const result = await canvaService.createAutofillJob('tok', 'tpl_1', {});
      expect(result.job.id).toBe('job_1');
    });
  });

  describe('exportDesign', () => {
    it('should return export result after polling', async () => {
      vi.spyOn(canvaService, '_request')
        .mockResolvedValueOnce({ job: { id: 'export_1' } })
        .mockResolvedValueOnce({ job: { status: 'in_progress' } })
        .mockResolvedValueOnce({ job: { status: 'success', download_url: 'https://example.com/doc.pdf' } });
      const result = await canvaService.exportDesign('tok', 'design_1');
      expect(result.status).toBe('success');
    });

    it('should return null on job failure', async () => {
      vi.spyOn(canvaService, '_request')
        .mockResolvedValueOnce({ job: { id: 'export_2' } })
        .mockResolvedValueOnce({ job: { status: 'failed', error: 'Render error' } });
      const result = await canvaService.exportDesign('tok', 'design_1');
      expect(result).toBeNull();
    });

    it('should return null if create export job fails', async () => {
      vi.spyOn(canvaService, '_request').mockResolvedValue(null);
      const result = await canvaService.exportDesign('tok', 'design_1');
      expect(result).toBeNull();
    });
  });
});
