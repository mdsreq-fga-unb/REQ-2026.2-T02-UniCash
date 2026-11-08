/** Security Rules no Firebase Emulator Suite (RNF03). Rode com `npm run test:rules`. */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
  testTimeout: 30000,
};
