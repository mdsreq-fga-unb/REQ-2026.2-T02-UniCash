/** Testes unitários, de serviço (SQLite em memória) e de telas. Regras do Firestore: jest.rules.config.js. */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/rules/'],
  // Os testes de tela com coverage no CI passam dos 5 s padrão por teste.
  testTimeout: 30000,
};
