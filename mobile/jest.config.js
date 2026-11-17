/** Testes unitários, de serviço (SQLite em memória) e de telas. Regras do Firestore: jest.rules.config.js. */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/rules/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/lib/firebase.ts',
    '!src/db/database.ts',
    '!src/features/receitas/types.ts',
    '!src/app/index.tsx',
  ],
  // Os testes de tela com coverage no CI passam dos 5 s padrão por teste.
  testTimeout: 30000,
};
