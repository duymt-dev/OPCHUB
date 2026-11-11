import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadMessages } from './message-loader';
import { overlayMessages } from './message-overlay';
import { messages, NAMESPACES, SETTINGS_PARTS } from './source-messages';
import baseline from './tests/catalog-baseline.json';
import { catalogIssues } from './tests/message-contract';

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

function leaves(value: unknown, prefix = ''): [string, string][] {
  if (typeof value === 'string') return [[prefix, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

const readSourcePart = (file: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, '../../messages/vi', `${file}.json`), 'utf8')) as unknown;

describe('D-141 AC824-03 source partition and fallback', () => {
  it('validates the actual Vietnamese source tree, not only synthetic ICU fixtures', () => {
    expect(
      catalogIssues(messages, messages, {
        locale: 'vi',
        emptyTextReasons: new Map([
          [
            'settings.renewal.actions',
            'Existing blank action-column header; preserve the baseline UI',
          ],
        ]),
      }),
    ).toEqual([]);
  });

  it('preserves all 524 settings strings byte-for-byte and the complete 2456-string source', () => {
    const entries = leaves(messages.settings).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    expect(entries).toHaveLength(baseline.stringLeaves);
    expect(createHash('sha256').update(JSON.stringify(entries)).digest('hex')).toBe(
      baseline.sha256,
    );
    expect(leaves(messages)).toHaveLength(2456);
    const roots = SETTINGS_PARTS.flatMap((part) =>
      Object.keys(readSourcePart(`settings/${part}`) as object),
    );
    expect(new Set(roots).size).toBe(roots.length);
    expect(roots.sort()).toEqual(Object.keys(messages.settings).sort());
  });

  it('overlays nested strings and arrays without changing source, adding keys or accepting invalid shapes', () => {
    const source = { title: 'Gốc', nested: { value: 'Gốc' }, items: ['A', 'B'] };
    const before = JSON.stringify(source);
    const fallback = vi.fn();
    expect(
      overlayMessages(
        source,
        {
          title: 'Source',
          nested: { value: '', unexpected: 'X' },
          items: ['Translated A'],
          extra: 'No',
        },
        fallback,
      ),
    ).toEqual({ title: 'Source', nested: { value: 'Gốc' }, items: ['A', 'B'] });
    expect(fallback.mock.calls).toEqual([
      ['nested.value', 'empty'],
      ['items', 'shape'],
    ]);
    expect(JSON.stringify(source)).toBe(before);
    expect(overlayMessages(source, null)).toBe(source);
    expect(overlayMessages(['A', 'B'], ['One', null])).toEqual(['One', 'B']);
    expect(overlayMessages({ a: 'A' }, { a: { bad: true } })).toEqual({ a: 'A' });
    expect(overlayMessages({ a: 'A' }, { a: '  ' })).toEqual({ a: 'A' });
  });

  it('never invokes a reader for missing/unsafe cookies, vi or inherited object names', async () => {
    const read = vi.fn();
    for (const code of [undefined, '', 'vi', 'xx', '../../en', '__proto__', 'constructor']) {
      expect(await loadMessages(code, read)).toBe(messages);
    }
    expect(read).not.toHaveBeenCalled();
  });

  it('uses the alias bundle only and preserves the logical settings namespace', async () => {
    const read = vi.fn((_bundle: string, file: string) => Promise.resolve(readSourcePart(file)));
    const translated = await loadMessages('en-SG', read);
    expect(translated).toEqual(messages);
    expect(read.mock.calls.every(([bundle]) => bundle === 'en')).toBe(true);
    expect(read.mock.calls.map(([, file]) => file).sort()).toEqual(
      [
        ...NAMESPACES.filter((ns) => ns !== 'settings'),
        ...SETTINGS_PARTS.map((part) => `settings/${part}`),
      ].sort(),
    );
    expect(translated.settings).not.toHaveProperty('core');
  });

  it('falls back on unreadable or duplicate settings parts, reporting canonical keys only', async () => {
    const onFallback = vi.fn();
    const result = await loadMessages(
      'en',
      async (_bundle, file) => {
        await Promise.resolve();
        if (file.startsWith('settings/')) return { duplicate: 'Invalid partition' };
        if (file === 'common') throw new Error('Sensitive local path must not escape');
        return readSourcePart(file);
      },
      onFallback,
    );
    expect(result.settings).toEqual(messages.settings);
    expect(result.common).toEqual(messages.common);
    expect(onFallback.mock.calls).toContainEqual(['settings', 'missing']);
    expect(onFallback.mock.calls).toContainEqual(['common', 'missing']);
    expect(JSON.stringify(onFallback.mock.calls)).not.toContain('Sensitive');
  });

  it('isolates simultaneous locale reads and never mutates shared vi messages', async () => {
    const before = JSON.stringify(messages);
    const read = async (bundle: string, file: string) => {
      await Promise.resolve();
      if (file === 'common') return { state: { loading: `${bundle}-fixture` } };
      return readSourcePart(file);
    };
    const [en, th, ms] = await Promise.all([
      loadMessages('en', read),
      loadMessages('th', read),
      loadMessages('ms-BN', read),
    ]);
    expect(en.common.state.loading).toBe('en-fixture');
    expect(th.common.state.loading).toBe('th-fixture');
    expect(ms.common.state.loading).toBe('ms-fixture');
    expect(JSON.stringify(messages)).toBe(before);
  });
});
