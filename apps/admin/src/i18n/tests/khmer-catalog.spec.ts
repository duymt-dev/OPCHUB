import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Staged12-file inventory only; the full25-file/10-bundle gate remains required. */
const FILES = [
  'auth',
  'common',
  'bot-options',
  'meta',
  'overview',
  'investors',
  'needs',
  'reports',
  'requests',
  'stores',
  'ui',
  'settings/audit',
] as const;
const NEUTRAL = new Map([
  ['auth.twoFactor.codePlaceholder', 'Unchanged numeric six-digit example'],
  ['bot-options.hours.0', 'Canonical time-range example'],
  ['bot-options.hours.1', 'Canonical time-range example'],
  ['bot-options.hours.2', 'Canonical time-range example'],
  ['bot-options.hours.3', 'Canonical time-range example'],
  ['meta.default', 'Required unchanged OPC Hub Admin brand'],
  ['overview.growth.delta', 'Numeric percent-point ICU expression'],
  ['investors.dateRange', 'Existing numeric date-range example'],
  ['needs.dateRange', 'Existing numeric date-range example'],
  ['requests.dateRange', 'Existing numeric date-range example'],
  ['stores.dateRange', 'Existing numeric date-range example'],
  ['settings/audit.log.tag.sso', 'Canonical SSO protocol abbreviation'],
]);
const read = (locale: string, file: string): unknown =>
  JSON.parse(
    readFileSync(join(__dirname, '../../../messages', locale, `${file}.json`), 'utf8'),
  ) as unknown;

function leaves(node: unknown, prefix = ''): [string, string][] {
  if (typeof node === 'string') return [[prefix, node]];
  return node && typeof node === 'object'
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, prefix ? `${prefix}.${key}` : key),
      )
    : [];
}

function valueAt(node: unknown, key: string): unknown {
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !Object.hasOwn(node, part)) throw new Error(key);
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

describe('D-141 AC824-02 staged Khmer raw catalogs before fallback, not full bundle', () => {
  it.each(FILES)('%s retains shape/keys/ICU/NFC without copied Vietnamese prose', (file) => {
    expect(
      catalogIssues(
        read('vi', file),
        read('km', file),
        {
          locale: 'km',
          sameTextReasons: NEUTRAL,
        },
        file,
      ),
    ).toEqual([]);
  });

  it.each([
    ['auth', 'login.submit', 'ចូលប្រើ'],
    ['auth', 'login.welcomeAdmin', 'ចូលផ្ទាំងគ្រប់គ្រង'],
    ['auth', 'login.welcomeUser', 'សួស្ដី ចូលវិបផតថលសមាជិក'],
    ['auth', 'twoFactor.code', 'លេខកូដ 6 ខ្ទង់'],
    ['common', 'adminProfile.enabled', 'បានបើកដំណើរការ'],
    ['common', 'adminProfile.disabled', 'មិនទាន់បើកដំណើរការ'],
    ['common', 'nav.reports', 'របាយការណ៍'],
    ['common', 'nav.affiliate', 'បណ្ដាញអ្នកណែនាំ'],
    ['meta', 'affiliate', 'អ្នកណែនាំ'],
    ['meta', 'reports', 'របាយការណ៍'],
    ['meta', 'profile', 'ប្រវត្តិរូបផ្ទាល់ខ្លួន'],
    ['overview', 'conversion.expired', 'ផុតកំណត់មិនទាន់បង់'],
    ['overview', 'conversion.director', 'នាយកតំបន់'],
    ['overview', 'flow.fees.sub', 'បើកដំណើរការដោយស្វ័យប្រវត្តិពេលផ្ទៀងផ្ទាត់ប្រាក់ផ្ទេរ'],
    ['investors', 'kind.fund', 'មូលនិធិវិនិយោគ'],
    ['investors', 'drawer.projects', 'គម្រោងដែលបានចាប់អារម្មណ៍ ({n})'],
    ['needs', 'type.sell', 'ត្រូវការទីផ្សារលក់'],
    ['reports', 'title', 'របាយការណ៍'],
    ['reports', 'metric.commission', 'កម្រៃជើងសារអ្នកណែនាំដែលកើតឡើង (đ)'],
    ['requests', 'drawer.threadCount', 'មតិ {n} · មានតែអ្នកគ្រប់គ្រងអាចមើលឃើញ'],
    ['requests', 'catalog.used', 'សំណើ {n}'],
    ['stores', 'drawer.contactPrice', 'ទាក់ទងស្នើសម្រង់តម្លៃ'],
    ['ui', 'permissions.affiliate.payout', 'បង់ប្រាក់ជូននាយកតំបន់'],
    ['ui', 'regions.central', 'ភាគកណ្ដាល'],
    ['ui', 'regions.centralDirector', 'ភាគកណ្ដាល និងតំបន់ខ្ពង់រាបកណ្ដាល'],
    ['ui', 'permissionMenus.affiliate', 'អ្នកណែនាំ'],
    ['ui', 'errors.adminPasswordRule', 'ពាក្យសម្ងាត់ថ្មីមានយ៉ាងតិច 8 តួអក្សរ រួមមានអក្សរធំ និងលេខ'],
    ['ui', 'editor.orderedListTitle', 'បញ្ជីលេខ'],
    ['settings/audit', 'log.heading', 'កំណត់ហេតុសកម្មភាពអ្នកគ្រប់គ្រង'],
    ['settings/audit', 'log.tag.permission', 'សិទ្ធិចូលប្រើ'],
  ])('D-141 AC824-06 preserves reviewed Admin context %s.%s', (file, key, expected) => {
    expect(valueAt(read('km', file ?? ''), key ?? '')).toBe(expected);
  });

  it('D-141 AC824-02 keeps only12 exact neutral examples equal to English, never English filler', () => {
    const retained: string[] = [];
    for (const file of FILES) {
      const english = new Map(leaves(read('en', file)));
      const source = new Map(leaves(read('vi', file)));
      for (const [key, value] of leaves(read('km', file))) {
        const full = `${file}.${key}`;
        if (NEUTRAL.has(full)) {
          expect(value, full).toBe(english.get(key));
          expect(value, full).toBe(source.get(key));
          retained.push(full);
        } else {
          expect(value, full).not.toBe(english.get(key));
          expect(value, full).toMatch(/\p{Script=Khmer}/u);
        }
      }
    }
    expect(retained.sort()).toEqual([...NEUTRAL.keys()].sort());
  });

  it('D-141 AC824-15 covers all729 staged leaves with unchanged Khmer/Latin cmaps', () => {
    const text = FILES.flatMap((file) => leaves(read('km', file)).map(([, value]) => value));
    expect(text).toHaveLength(729);
    const ranges = [receipt.assets.NotoSans.cmap, receipt.assets.NotoSansKhmer.cmap]
      .flatMap((cmap) => cmap.split(','))
      .map((range) => {
        const [start = '', end = ''] = range.split('-');
        return [parseInt(start, 16), parseInt(end, 16)] as const;
      });
    for (const char of new Set(text.join(''))) {
      if (!/[\p{L}\p{M}\p{N}\p{P}\p{Sc}]/u.test(char)) continue;
      const point = char.codePointAt(0) ?? -1;
      expect(
        ranges.some(([start, end]) => point >= start && point <= end),
        char,
      ).toBe(true);
    }
  });
});
