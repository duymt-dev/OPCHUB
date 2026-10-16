import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { base } from './base.js';

/** Frontend: trần 400 dòng/file */
export const react = () =>
  tseslint.config(...base(400), jsxA11y.flatConfigs.recommended, {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-properties': [
        'error',
        { property: 'dangerouslySetInnerHTML', message: 'Chỉ SafeHtml được render HTML.' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['antd/es/*', 'antd/lib/*'], message: "Import từ 'antd'." }] },
      ],
    },
  });
