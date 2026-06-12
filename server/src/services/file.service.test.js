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

  describe('File Expiry and Update Operations', () => {
    beforeEach(async () => {
      // Clear users/files in json db if any
      const data = db.useJsonDb() ? require('fs').readFileSync(require('path').join(__dirname, '../../../db.json'), 'utf8') : '{}';
      if (db.useJsonDb()) {
        const parsed = JSON.parse(data);
        parsed.users = [];
        parsed.files = [];
        require('fs').writeFileSync(require('path').join(__dirname, '../../../db.json'), JSON.stringify(parsed, null, 2));
      }
    });

    it('should update file expiry date successfully', async () => {
      const userRes = await db.query(
        'INSERT INTO users (username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['testuser', 'testuser@example.com', 'hash', 'Test User', 'cr']
      );
      const userId = userRes.rows[0].id;

      const fileResult = await db.query(
        'INSERT INTO files (original_name, storage_path, file_type, file_size, uploaded_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        ['test_expiry.txt', 'test_expiry.txt', 'text/plain', 200, userId, new Date().toISOString()]
      );
      const file = fileResult.rows[0];
      expect(file).toBeDefined();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const updated = await fileService.updateFileExpiry(file.id, futureDate.toISOString(), userId);
      
      expect(updated).toBeDefined();
      expect(new Date(updated.expires_at).getDate()).toBe(futureDate.getDate());

      const permanent = await fileService.updateFileExpiry(file.id, null, userId);
      expect(permanent.expires_at).toBeNull();
    });

    it('should fail to update if unauthorized', async () => {
      const userRes = await db.query(
        'INSERT INTO users (username, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['testuser', 'testuser@example.com', 'hash', 'Test User', 'cr']
      );
      const userId = userRes.rows[0].id;

      const fileResult = await db.query(
        'INSERT INTO files (original_name, storage_path, file_type, file_size, uploaded_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        ['test_expiry2.txt', 'test_expiry2.txt', 'text/plain', 200, userId, new Date().toISOString()]
      );
      const file = fileResult.rows[0];

      const differentUserId = userId + 1;
      await expect(
        fileService.updateFileExpiry(file.id, null, differentUserId)
      ).rejects.toThrow('Unauthorized to modify this file');
    });
  });
});
