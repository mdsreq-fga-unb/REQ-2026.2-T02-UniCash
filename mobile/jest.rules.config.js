/** Security Rules no Firebase Emulator Suite (RNF03). */
module.exports = {
  preset: 'jest-expo/node',
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/tests/rules/**/*.rules.test.ts'],
  // As suítes compartilham o projeto do emulador e limpam o banco entre testes.
  maxWorkers: 1,
  testTimeout: 30000,
};
