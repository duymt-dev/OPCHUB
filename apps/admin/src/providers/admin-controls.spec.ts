import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('D-141 AC824-09/15 keeps both calendar panels/presets inside mobile Admin without masking', () => {
  const css = readFileSync(resolve(__dirname, 'admin-controls.module.css'), 'utf8');
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('.scope :global(.ant-picker-panels)');
  expect(css).toContain('flex-direction: column');
  expect(css).toContain('flex-wrap: wrap');
  expect(css).toContain('overflow-y: auto');
  expect(css).not.toMatch(
    /overflow(?:-x)?:\s*hidden|display:\s*none|visibility:\s*hidden|text-overflow|line-clamp|!important/,
  );
});

it('D-141 AC824-15 mounts scope only on existing Admin body, preserving Portal root', () => {
  const admin = readFileSync(resolve(__dirname, '../app/layout.tsx'), 'utf8');
  expect(admin).toContain('<body className={controls.scope}');
  const portal = readFileSync(
    resolve(__dirname, '../../../../apps/portal/src/app/layout.tsx'),
    'utf8',
  );
  expect(portal).not.toContain('admin-controls');
});
