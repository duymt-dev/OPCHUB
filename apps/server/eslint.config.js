import { base } from '@opchub/config/eslint/base';

export default [
  ...base(600),
  {
    // TIP-V2-305 (TD-010, BUG-012): code production không dùng bộ dữ liệu giả của MSW
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@opchub/shared/mock-domains',
              message: 'Code production không import dữ liệu giả MSW (TD-010).',
            },
          ],
        },
      ],
    },
  },
];
