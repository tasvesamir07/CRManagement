const db = require('../config/database');

const templateService = require('./template.service');

describe('Template Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTemplates', () => {
    it('should return all active templates', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, name: 'Notice', category: 'notice' }] });
      const result = await templateService.getTemplates();
      expect(result).toHaveLength(1);
    });

    it('should filter by userId', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await templateService.getTemplates(1);
      expect(spy.mock.calls[0][0]).toContain('created_by = $1');
      expect(spy.mock.calls[0][1]).toEqual([1]);
    });
  });

  describe('getTemplateById', () => {
    it('should return a template by id', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, name: 'Notice' }] });
      const result = await templateService.getTemplateById(1);
      expect(result.id).toBe(1);
    });

    it('should return null if not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      const result = await templateService.getTemplateById(999);
      expect(result).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create a template', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, name: 'Notice', category: 'notice' }] });
      const result = await templateService.createTemplate({
        name: 'Notice', title_template: 'Title', content_template: 'Content', created_by: 1
      });
      expect(result.id).toBe(1);
      expect(spy.mock.calls[0][1][1]).toBe('');
      expect(spy.mock.calls[0][1][2]).toBe('notice');
    });
  });

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1, name: 'Updated' }] });
      const result = await templateService.updateTemplate(1, {
        name: 'Updated', description: 'Desc', category: 'exam', title_template: 'T', content_template: 'C', variables: []
      });
      expect(result.name).toBe('Updated');
    });

    it('should throw if not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await expect(templateService.updateTemplate(999, {
        name: 'X', description: '', category: 'notice', title_template: 'T', content_template: 'C', variables: []
      })).rejects.toThrow('Template not found');
    });
  });

  describe('deleteTemplate', () => {
    it('should soft-delete a template', async () => {
      const spy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await templateService.deleteTemplate(1);
      expect(result.id).toBe(1);
      expect(spy.mock.calls[0][0]).toContain('SET is_active = false');
    });
  });
});
