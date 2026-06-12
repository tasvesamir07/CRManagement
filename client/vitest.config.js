import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.jsx', 'src/**/*.test.js', 'src/**/*.spec.jsx', 'src/**/*.spec.js'],
    setupFiles: ['./src/test/setup.js'],
    css: true,
  },
});
