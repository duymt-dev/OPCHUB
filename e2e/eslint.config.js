import { base } from '@opchub/config/eslint/base';

export default [
  ...base(600),
  { ignores: ['scripts/**', '.parity-out/**', 'test-results/**', 'playwright-report/**'] },
  {
    // Kịch bản Playwright (spec + bộ audit W1, TIP-V2-115): mỗi test là một chuỗi bước tuần tự,
    // tách hàm chỉ làm khó đọc. Trần dòng/file (600) vẫn áp dụng.
    files: ['**/*.spec.ts', '**/*.audit.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['env.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
