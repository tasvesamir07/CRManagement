const jwt = require('jsonwebtoken');
const { verifyToken } = require('./auth.service');

describe('Auth Service', () => {
  describe('verifyToken', () => {
    it('should return decoded payload for a valid token', () => {
      const payload = { id: 1, username: 'testuser', role: 'cr' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      const decoded = verifyToken(token);

      expect(decoded).toMatchObject({
        id: payload.id,
        username: payload.username,
        role: payload.role,
      });
    });

    it('should throw for an expired token', () => {
      const payload = { id: 1, username: 'testuser', role: 'cr' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '0s' });

      expect(() => verifyToken(token)).toThrow('Invalid or expired token');
    });

    it('should throw for a token signed with a different secret', () => {
      const payload = { id: 1, username: 'testuser', role: 'cr' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      expect(() => verifyToken(token)).toThrow('Invalid or expired token');
    });

    it('should throw for a malformed token', () => {
      expect(() => verifyToken('not-a-token')).toThrow('Invalid or expired token');
    });
  });
});
