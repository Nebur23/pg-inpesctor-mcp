import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000, // Increased to 2 minutes
    hookTimeout: 120000, // Increased to 2 minutes for beforeAll/afterAll
  },
});