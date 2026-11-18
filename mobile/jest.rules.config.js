/** Security Rules no Firebase Emulator Suite (RNF03). Rode com `npm run test:rules`. */
module.exports = {
  preset: 'jest-expo/node',
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
  testTimeout: 30000,
};
