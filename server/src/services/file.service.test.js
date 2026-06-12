const fileService = require('./file.service');
const db = require('../config/database');

describe('File Service', () => {
  describe('exports', () => {
    it('should have expected exports', () => {
      const serviceKeys = Object.keys(fileService);
      expect(serviceKeys).toContain('uploadsDir');
      expect(serviceKeys).toContain('uploadFile');
      expect(serviceKeys).toContain('cleanupExpiredFiles');
      expect(serviceKeys).toContain('getStorageUsage');
      expect(serviceKeys).toContain('listFolders');
      expect(serviceKeys).toContain('createFolder');
      expect(serviceKeys).toContain('deleteFolder');
    });

    it('should have a valid uploadsDir path', () => {
      expect(fileService.uploadsDir).toBeDefined();
      expect(typeof fileService.uploadsDir).toBe('string');
    });
  });

  describe('Folders operations', () => {
    let mockUserId = 999;
    let mockCourseId = 888;

    beforeEach(async () => {
      // Clean up previous database insertions if needed
      // Note: simulateQuery doesn't support generic deletes but our mock db will start clean/reset
    });

    it('should create and list folders successfully', async () => {
      const folderName = 'Test Custom Folder';
      const created = await fileService.createFolder(folderName, null, mockUserId);
      
      expect(created).toBeDefined();
      expect(created.name).toBe(folderName);
      expect(created.created_by).toBe(mockUserId);
      expect(created.course_id).toBeNull();

      const folders = await fileService.listFolders(mockUserId);
      const found = folders.find(f => f.id === created.id);
      expect(found).toBeDefined();
      expect(found.name).toBe(folderName);
    });

    it('should successfully delete a folder', async () => {
      const created = await fileService.createFolder('To Delete', null, mockUserId);
      const deleteSuccess = await fileService.deleteFolder(created.id, false);
      expect(deleteSuccess).toBe(true);

      const folders = await fileService.listFolders(mockUserId);
      const found = folders.find(f => f.id === created.id);
      expect(found).toBeUndefined();
    });
  });
});
