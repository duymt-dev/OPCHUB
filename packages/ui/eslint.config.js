import { react } from '@opchub/config/eslint/react';

export default [
  ...react(),
  {
    files: ['src/safe-html/safe-html.tsx'],
    rules: { 'no-restricted-properties': 'off' },
  },
];
