import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import receipt from '../intl-data/receipt.json';
import timezone from '../intl-data/vietnam-time-zone.json';

const require = createRequire(import.meta.url);
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const root = join(__dirname, '../intl-data');

describe('D-141 AC824-08/16 reproducible finite official CLDR resources', () => {
  it('pins six package locale modules, not copied giant catalogs or all-language payloads', () => {
    expect(receipt.cldr).toBe('49');
    expect(Object.keys(receipt.localeSources).sort()).toEqual([
      'km-date',
      'km-number',
      'lo-date',
      'lo-number',
      'my-date',
      'my-number',
    ]);
    for (const source of Object.values(receipt.localeSources)) {
      const base = dirname(require.resolve(source.package));
      const bytes = readFileSync(join(base, source.file));
      expect(bytes.length).toBe(source.bytes);
      expect(hash(bytes)).toBe(source.sha256);
    }
    expect(readdirSync(root).sort()).toEqual([
      'LICENSE.txt',
      'receipt.json',
      'vietnam-time-zone.json',
    ]);
  });

  it('retains exact upstream licenses/versions and the actual Vietnam IANA history, not fixed +07', () => {
    const license = readFileSync(join(root, 'LICENSE.txt'));
    expect(license.toString('utf8')).toContain('MIT License');
    for (const [name, expected] of Object.entries(receipt.packages)) {
      const base = dirname(require.resolve(name));
      const manifest = z
        .object({ version: z.string() })
        .parse(JSON.parse(readFileSync(join(base, 'package.json'), 'utf8')) as unknown);
      expect(manifest.version).toBe(expected.version);
      expect(hash(readFileSync(join(base, 'LICENSE.md')))).toBe(expected.licenseSha256);
      expect(hash(license)).toBe(expected.licenseSha256);
      expect(hash(readFileSync(join(root, '../../../public/licenses/formatjs-intl.txt')))).toBe(
        expected.licenseSha256,
      );
    }
    const bytes = readFileSync(join(root, 'vietnam-time-zone.json'));
    expect(hash(bytes)).toBe(receipt.assets['vietnam-time-zone.json'].sha256);
    expect(bytes.length).toBe(receipt.assets['vietnam-time-zone.json'].bytes);
    expect(timezone.zones).toHaveLength(1);
    expect(timezone.zones[0]?.split('|')[0]).toBe('Asia/Ho_Chi_Minh');
    expect(timezone.zones[0]?.split('|').length).toBeGreaterThan(4);
  });
});
