const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/app/index.tsx',
    'src/components/saldo/**/*.tsx',
    'src/features/saldo/**/*.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/uc04',
  coverageThreshold: {},
};
