import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../components/setup.module.css'), 'utf8');
const rule = (name: 'btn' | 'primary') => {
  const body = new RegExp(`\\.${name} \\{([^}]+)\\}`).exec(css)?.[1];
  if (!body) throw new Error('Missing auth action style');
  return body;
};

it('D-141 AC824-15 sizes Admin auth actions from full labels with36px minimum', () => {
  for (const name of ['btn', 'primary'] as const) {
    expect(rule(name)).toMatch(/\n\s*height:\s*auto;/);
    expect(rule(name)).toContain('min-height: 36px');
    expect(rule(name)).toContain('min-width: 0');
    expect(rule(name)).toContain('max-width: 100%');
    expect(rule(name)).toContain('overflow-wrap: anywhere');
  }
});
it('D-141 AC824-15 preserves existing padding and never hides/truncates auth action labels', () => {
  expect(rule('btn')).toContain('padding: 0 15px');
  expect(rule('primary')).toContain('padding: 0 18px');
  for (const name of ['btn', 'primary'] as const)
    expect(rule(name)).not.toMatch(
      /overflow:\s*hidden|text-overflow|line-clamp|white-space:\s*nowrap/,
    );
});
