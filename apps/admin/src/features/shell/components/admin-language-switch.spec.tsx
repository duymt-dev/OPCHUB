import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ComponentProps } from 'react';
import type { LanguageSwitch } from '@opchub/ui';
import { AdminLanguageSwitch } from './admin-language-switch';

const observed = vi.hoisted(() => ({
  props: undefined as ComponentProps<typeof LanguageSwitch> | undefined,
}));
vi.mock('@opchub/ui', () => ({
  LanguageSwitch: (props: ComponentProps<typeof LanguageSwitch>) => {
    observed.props = props;
    return <button>{props.current}</button>;
  },
}));
afterEach(cleanup);

it('D-141 AC824-15 forwards native options/cookie/identity/variant unchanged, no Portal mutation', () => {
  const props: ComponentProps<typeof LanguageSwitch> = {
    title: 'Language fixture',
    current: 'id',
    cookieName: 'NEXT_LOCALE',
    variant: 'topbar',
    options: [
      { code: 'id', native: 'Bahasa Indonesia', country: 'Indonesia', flagSrc: '/flag.svg' },
    ],
  };
  render(<AdminLanguageSwitch {...props} />);
  expect(observed.props).toEqual(props);
  expect(observed.props?.options).toBe(props.options);
});

it('D-141 AC824-15 scopes measured geometry correction to mobile Admin, without clipping labels', () => {
  const css = readFileSync(resolve(__dirname, 'admin-language-switch.module.css'), 'utf8');
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('padding-inline: 10px');
  expect(css).toContain('position: fixed');
  expect(css).toContain('inset-inline: 16px');
  expect(css).toContain('overflow-y: auto');
  expect(css).not.toMatch(
    /overflow(?:-x)?:\s*hidden|text-overflow|line-clamp|display:\s*none|\[lang|!important/,
  );
  const root = resolve(__dirname, '../../../../../..');
  expect(readFileSync(resolve(root, 'apps/portal/src/app/layout.tsx'), 'utf8')).not.toContain(
    'admin-language-switch',
  );
});
