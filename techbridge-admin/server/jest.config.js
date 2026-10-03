export default {
  testEnvironment: 'node',
  // We use native ES modules, so no Babel transform is needed
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
  // The first run downloads a MongoDB binary for the in-memory test database
  testTimeout: 120000,
};