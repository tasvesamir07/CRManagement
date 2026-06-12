// Set test environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.STORAGE_LIMIT_BYTES = '104857600';
