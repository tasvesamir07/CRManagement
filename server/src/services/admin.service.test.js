const db = require('../config/database');

const adminService = require('./admin.service');

describe('Admin Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all active users without sensitive fields', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({
        rows: [
          { id: 1, username: 'user1', password_hash: 'secret', display_name: 'User 1' },
          { id: 2, username: 'user2', password_hash: 'secret', display_name: 'User 2' }
        ]
      });
      const users = await adminService.getAllUsers();
      expect(users).toHaveLength(2);
      expect(users[0]).not.toHaveProperty('password_hash');
      expect(users[0]).not.toHaveProperty('two_factor_secret');
    });
  });

  describe('adminCreateUser', () => {
    it('should create a user successfully', async () => {
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt');
      vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed');

      vi.spyOn(db, 'query')
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, username: 'newuser', display_name: 'New User', role: 'cr' }]
        });

      const user = await adminService.adminCreateUser({
        username: 'newuser', email: 'new@test.com', password: 'pass123', displayName: 'New User', role: 'cr'
      });

      expect(user.username).toBe('newuser');
      expect(user).not.toHaveProperty('password_hash');
    });

    it('should throw if username exists', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await expect(adminService.adminCreateUser({
        username: 'existing', email: 'new@test.com', password: 'pass123'
      })).rejects.toThrow('Username already exists');
    });

    it('should throw if email exists', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await expect(adminService.adminCreateUser({
        username: 'new', email: 'exists@test.com', password: 'pass123'
      })).rejects.toThrow('Email already exists');
    });
  });

  describe('adminUpdateUser', () => {
    it('should update user fields', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({
        rows: [{ id: 1, username: 'user1', display_name: 'Updated', role: 'admin' }]
      });
      const result = await adminService.adminUpdateUser(1, { displayName: 'Updated', role: 'admin' });
      expect(result.display_name).toBe('Updated');
      expect(result.role).toBe('admin');
    });

    it('should throw if no fields to update', async () => {
      await expect(adminService.adminUpdateUser(1, {})).rejects.toThrow('No fields to update');
    });

    it('should throw if user not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await expect(adminService.adminUpdateUser(999, { displayName: 'X' })).rejects.toThrow('User not found');
    });
  });

  describe('adminDeleteUser', () => {
    it('should soft-delete a user', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await adminService.adminDeleteUser(1);
      expect(result).toEqual({ message: 'User deactivated successfully' });
    });

    it('should throw if user not found', async () => {
      vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
      await expect(adminService.adminDeleteUser(999)).rejects.toThrow('User not found');
    });
  });
});
