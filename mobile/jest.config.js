
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
  ],

  coverageReporters: ['text', 'text-summary', 'lcov'],

  coverageThreshold: {
    'src/**/despesas/**/*.{ts,tsx}': {
      statements: 90,
      branches: 72,
      functions: 85,
      lines: 91,
    },
    './src/features/despesas/service.ts': {
      statements: 100,
      branches: 90,
      functions: 100,
      lines: 100,
    },
    // Sincronização do UC02 (envio e restauração de despesas) também fica sob controle.
    './src/features/receitas/sync.ts': {
      statements: 97,
      branches: 90,
      functions: 100,
      lines: 98,
    },
    // UC03: cálculos, hook e tela do resumo financeiro (tela inicial).
    'src/**/resumo/**/*.{ts,tsx}': {
      statements: 90,
      branches: 70,
      functions: 85,
      lines: 90,
    },
    'src/app/index.tsx': {
      statements: 90,
      branches: 70,
      functions: 85,
      lines: 90,
    },
  },

  // Os testes de tela com coverage no CI passam dos 5 s padrão por teste.
  testTimeout: 30000,
};
