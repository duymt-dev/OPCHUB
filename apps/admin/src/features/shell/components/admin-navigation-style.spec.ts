import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'admin-navigation.css'), 'utf8');

it('D-141 AC824-15 imports wrapping only from the Admin root, not the Portal root', () => {
  const root = resolve(__dirname, '../../../../../..');
  const admin = readFileSync(resolve(root, 'apps/admin/src/app/layout.tsx'), 'utf8');
  const portal = readFileSync(resolve(root, 'apps/portal/src/app/layout.tsx'), 'utf8');
  expect(admin).toContain("import '@/features/shell/components/admin-navigation.css';");
  expect(portal).not.toContain('admin-navigation');
});

it('D-141 AC824-15 wraps real sidebar labels and keeps badges from shrinking', () => {
  expect(css).toMatch(/aside\[data-mini\]\s*>\s*nav\s*>\s*a\s*>\s*span:first-of-type/);
  expect(css).toContain('min-width: 0;');
  expect(css).toContain('white-space: normal;');
  expect(css).toContain('overflow-wrap: anywhere;');
  expect(css).toMatch(/span:nth-of-type\(2\)\s*\{\s*flex-shrink: 0;/);
});

it('D-141 AC824-15 never changes theme/geometry, hides text, or special-cases a language', () => {
  expect(css).not.toMatch(
    /(?:^|\n)\s*(?:width|height|padding|margin|font-size|display|overflow(?:-x|-y)?)\s*:/,
  );
  expect(css).not.toMatch(/!important|text-overflow|line-clamp|\[lang|lang\(/);
});
