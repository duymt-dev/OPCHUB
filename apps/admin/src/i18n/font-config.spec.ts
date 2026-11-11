import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { languageOptions } from '@opchub/shared/fixtures';
import { describe, expect, it } from 'vitest';
import { adminFontStyle } from './font-config';
import receipt from './font-assets.json';

const ROOT = join(__dirname, '../../public/fonts');
const ASSETS = Object.keys(receipt.assets) as (keyof typeof receipt.assets)[];
const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const ranges = (value: string) =>
  value.split(',').map((range) => {
    const [start = '', end = ''] = range.split('-');
    return [parseInt(start, 16), parseInt(end, 16)] as const;
  });
const hasGlyph = (family: keyof typeof receipt.assets, point: number) =>
  ranges(receipt.assets[family].cmap).some(([start, end]) => point >= start && point <= end);

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : path.endsWith('.json') ? [path] : [];
  });
}
function strings(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (node && typeof node === 'object') return Object.values(node).flatMap(strings);
  return [];
}

describe('D-141 AC824-15/16 self-hosted font contracts (not browser acceptance)', () => {
  it.each(languageOptions)('selects only Latin plus the necessary script for $code', ({ code }) => {
    const scripts: Record<string, string> = {
      zh: 'SC',
      th: 'Thai',
      km: 'Khmer',
      lo: 'Lao',
      my: 'Myanmar',
    };
    const style = adminFontStyle(code)['--admin-font-family'];
    expect(style).toBe(
      scripts[code]
        ? `'OPCHUB Latin', 'OPCHUB ${scripts[code]}', sans-serif`
        : "'OPCHUB Latin', sans-serif",
    );
    expect(style).not.toContain('Language Menu');
  });

  it.each(['', '../zh', 'zh/../../th', 'XX', 'constructor'])('fails closed for %s', (code) => {
    expect(adminFontStyle(code)).toEqual({ '--admin-font-family': "'OPCHUB Latin', sans-serif" });
  });

  it.each(ASSETS)('verifies actual WOFF2 size/hash and shaping receipt for %s', (family) => {
    const bytes = readFileSync(join(ROOT, `${family}-Regular.woff2`));
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('wOF2');
    expect(bytes.length).toBe(receipt.assets[family].bytes);
    expect(sha(bytes)).toBe(receipt.assets[family].sha256);
    expect(receipt.assets[family].glyphs).toBeGreaterThan(10);
    expect(receipt.assets[family].tables).toContain('GSUB');
    expect(receipt.assets[family].tables).toContain('GPOS');
  });

  it('pins real upstream URLs and packages all six unchanged OFL copyright/licenses', () => {
    expect(receipt.fonttools).toBe('4.68.0');
    expect(receipt.brotli).toBe('1.2.1');
    expect(receipt.weight).toBe(400);
    for (const [family, source] of Object.entries(receipt.sources)) {
      expect(source.fontUrl).toContain(`/google/fonts/${receipt.upstreamCommit}/ofl/`);
      expect(source.licenseUrl).toContain(`/google/fonts/${receipt.upstreamCommit}/ofl/`);
      const bytes = readFileSync(join(ROOT, `OFL-${family}.txt`));
      expect(sha(bytes)).toBe(source.licenseSha256);
      expect(bytes.toString('utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1');
      expect(bytes.toString('utf8')).toContain('Copyright');
    }
  });

  it('covers every original native name and country in the small selector-only font', () => {
    for (const option of languageOptions) {
      for (const char of option.native + option.country) {
        expect(hasGlyph('LanguageMenu', char.codePointAt(0) ?? -1), char).toBe(true);
      }
    }
    expect(receipt.assets.LanguageMenu.bytes).toBeLessThan(70_000);
  });

  it.each(['vi', 'en', 'zh', 'id'])(
    'covers letter/mark/number/punctuation/currency glyphs in current %s catalogs',
    (locale) => {
      const catalogs = files(join(__dirname, '../../messages', locale));
      expect(catalogs).toHaveLength(25);
      const text = catalogs
        .flatMap((file) => strings(JSON.parse(readFileSync(file, 'utf8'))))
        .join('');
      for (const char of new Set(text)) {
        if (/[\p{L}\p{M}\p{N}\p{P}\p{Sc}]/u.test(char)) {
          const point = char.codePointAt(0) ?? -1;
          expect(
            hasGlyph('NotoSans', point) || (locale === 'zh' && hasGlyph('NotoSansSC', point)),
            `${locale}: ${char}`,
          ).toBe(true);
        }
      }
    },
  );

  it('registers seven local CSS assets, applies selected families to AntD and isolates the menu subset', () => {
    const css = readFileSync(join(__dirname, 'fonts.css'), 'utf8');
    expect(css.match(/@font-face/g)).toHaveLength(12);
    expect(css).not.toMatch(/https?:\/\/|local\(/);
    for (const family of ASSETS)
      expect(css).toContain(`../../public/fonts/${family}-Regular.woff2`);
    expect(css).toContain("[class^='ant-']:not(code):not(pre)");
    expect(css).toContain('[data-admin-auth-font] > div');
    expect(
      readFileSync(join(__dirname, '../features/auth/components/auth-frame.tsx'), 'utf8'),
    ).toContain('<div data-admin-auth-font>');
    expect(css).toContain("[role='listbox'] > button[role='option']");
    expect(css).toContain('font-display: swap');
    expect(css.match(/ascent-override:/g)).toHaveLength(6);
    expect(css).toContain('max-height: calc(100dvh - 96px)');
  });
});
