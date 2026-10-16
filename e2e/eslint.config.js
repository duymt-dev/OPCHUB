import { base } from '@opchub/config/eslint/base';

export default [
  ...base(600),
  { ignores: ['scripts/**', '.parity-out/**', 'test-results/**', 'playwright-report/**'] },
  {
    files: ['**/*.spec.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['env.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
