import { next } from '@opchub/config/eslint/next';

export default [
  ...next(),
  { ignores: ['public/**'] },
  {
    files: ['src/lib/env.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
