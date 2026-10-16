import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Rule chung — coding-packs/standards/global/code-structure.md */
export const base = (maxLines = 600) =>
  tseslint.config(
    {
      ignores: [
        '**/.next/**',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.config.*',
        'next-env.d.ts',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.browser, ...globals.node },
        parserOptions: { projectService: true },
      },
      rules: {
        'max-lines': ['error', { max: maxLines, skipBlankLines: true, skipComments: true }],
        'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
        'no-console': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/ban-ts-comment': 'error',
        'no-restricted-syntax': [
          'error',
          {
            selector: "MemberExpression[object.name='process'][property.name='env']",
            message: 'Đọc env qua lib/env.ts (zod), không dùng process.env trực tiếp.',
          },
        ],
      },
    },
    {
      files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
      rules: { 'max-lines-per-function': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
    },
  );
