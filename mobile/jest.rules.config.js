/** Security Rules no Firebase Emulator Suite (RNF03). Rode com `npm run test:rules`. */
module.exports = {
  preset: 'jest-expo/node',
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
  testTimeout: 30000,
};

/** Testes unitários, de serviço (SQLite em memória) e de telas. Regras do Firestore: jest.rules.config.js. */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/rules/'],
  testTimeout: 20000,
};