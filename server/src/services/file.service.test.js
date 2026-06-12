const fileService = require('./file.service');

describe('File Service', () => {
  describe('exports', () => {
    it('should have expected exports', () => {
      const serviceKeys = Object.keys(fileService);
      expect(serviceKeys).toContain('uploadsDir');
      expect(serviceKeys).toContain('uploadFile');
      expect(serviceKeys).toContain('cleanupExpiredFiles');
      expect(serviceKeys).toContain('getStorageUsage');
    });

    it('should have a valid uploadsDir path', () => {
      expect(fileService.uploadsDir).toBeDefined();
      expect(typeof fileService.uploadsDir).toBe('string');
    });
  });
});
