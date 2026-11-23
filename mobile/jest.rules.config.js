/** Security Rules no Firebase Emulator Suite (RNF03). */
module.exports = {
  preset: 'jest-expo/node',
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/tests/rules/**/*.rules.test.ts'],
  testTimeout: 30000,
};