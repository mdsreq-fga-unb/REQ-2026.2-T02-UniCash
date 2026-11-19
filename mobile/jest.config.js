
/** Testes unitários, de serviço, telas e cobertura da funcionalidade de despesas. */
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
    'src/**/despesas/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],

  coverageReporters: ['text', 'text-summary', 'lcov'],

  coverageThreshold: {
    'src/**/despesas/**/*.{ts,tsx}': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
