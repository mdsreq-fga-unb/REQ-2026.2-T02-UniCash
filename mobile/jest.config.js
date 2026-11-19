
/** Testes unitários, de serviço, telas e cobertura das funcionalidades. */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/rules/',
  ],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/lib/firebase.ts',
    '!src/db/database.ts',
    '!src/features/receitas/types.ts',
    '!src/app/index.tsx',
  ],

  coverageReporters: ['text', 'text-summary', 'lcov'],

  coverageThreshold: {
    'src/**/despesas/**/*.{ts,tsx}': {
      statements: 90,
      branches: 70,
      functions: 85,
      lines: 90,
    },
    // Sincronização do UC02 (envio e restauração de despesas) também fica sob controle.
    './src/features/receitas/sync.ts': {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95,
    },
  },

  testTimeout: 30000,
};
