const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/**/*.spec.js'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 60,
        lines: 70,
      },
    },
    setupFiles: ['./src/test/setup.js'],
  },
});
