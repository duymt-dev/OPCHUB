import nextPlugin from '@next/eslint-plugin-next';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
import { react } from './react.js';

/** Next.js app: thêm rule Next + ranh giới feature */
export const next = () =>
  tseslint.config(...react(), {
    plugins: { '@next/next': nextPlugin, boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
        { type: 'lib', pattern: 'src/lib/**' },
        { type: 'providers', pattern: 'src/providers/**' },
        { type: 'mocks', pattern: 'src/mocks/**' },
      ],
      'boundaries/include': ['src/**/*'],
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'lib' } },
              disallow: { to: { element: { types: { anyOf: ['app', 'feature', 'providers'] } } } },
            },
            {
              from: { element: { type: 'feature' } },
              disallow: { to: { element: { types: { anyOf: ['app', 'providers'] } } } },
            },
          ],
        },
      ],
    },
  });
