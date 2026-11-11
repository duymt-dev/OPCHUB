import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Staged12-file checkpoint, NOT a complete25-file Filipino bundle or final10-bundle gate.
 * Enumerated explicitly: deleting a staged file fails instead of quietly shrinking coverage.
 */
const FILES = [
  'affiliate',
  'auth',
  'bot-options',
  'common',
  'investors',
  'needs',
  'meta',
  'overview',
  'reports',
  'requests',
  'stores',
  'ui',
] as const;

const read = (locale: string, file: string): unknown =>
  JSON.parse(
    readFileSync(join(__dirname, '../../../messages', locale, `${file}.json`), 'utf8'),
  ) as unknown;

function valueAt(node: unknown, key: string): unknown {
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !Object.hasOwn(node, part)) throw new Error(key);
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  return value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
}

describe('D-141 AC824-02 staged Filipino12-file raw catalogs (whole bundle incomplete)', () => {
  it.each(FILES)(
    '%s keeps exact source shape/keys/ICU and contains no copied Vietnamese prose',
    (file) => {
      expect(catalogIssues(read('vi', file), read('fil', file), { locale: 'fil' }, file)).toEqual(
        [],
      );
    },
  );

  it.each([
    ['reports', 'title', 'Mga Ulat'],
    ['common', 'nav.reports', 'Mga Ulat'],
    ['meta', 'reports', 'Mga Ulat'],
    ['ui', 'permissionMenus.reports', 'Mga Ulat'],
    [
      'affiliate',
      'regional.share.pendingStatus',
      'Naghihintay ng pagbabayad sa katapusan ng buwan',
    ],
    ['affiliate', 'regional.share.director', 'Direktor ng Rehiyon'],
    ['affiliate', 'policy.personal', 'Personal na Plano'],
    ['affiliate', 'policy.business', 'Planong Pangnegosyo'],
    ['affiliate', 'policy.fundraisingPlan', 'Planong Paglikom ng Pondo'],
    ['affiliate', 'noRegion', 'Walang nakatalagang rehiyon · 100% Media Soft'],
    ['auth', 'login.welcomeAdmin', 'Mag-sign in sa Admin Dashboard'],
    ['auth', 'login.welcomeUser', 'Kumusta, mag-sign in sa User Portal'],
    ['auth', 'twoFactor.code', '6-digit na code'],
    ['common', 'adminProfile.disabled', 'Hindi pa pinagana'],
    ['common', 'adminProfile.enabled', 'Pinagana'],
    ['common', 'adminProfile.emailHint', 'Email na itinalaga ng administrador'],
    ['investors', 'title', 'Mga Mamumuhunan'],
    ['investors', 'kind.fund', 'Pondong pamumuhunan'],
    ['needs', 'table.store', 'Tindahan'],
    ['overview', 'conversion.paid', 'Nakabayad'],
    ['overview', 'conversion.expired', 'Nag-expire at hindi pa bayad'],
    ['requests', 'drawer.thread', 'Panloob na talakayan'],
    ['stores', 'table.store', 'Tindahan'],
    ['ui', 'regions.centralDirector', 'Gitna at Gitnang Kabundukan'],
    ['ui', 'permissions.affiliate.payout', 'Bayaran ang mga Direktor ng Rehiyon'],
    ['ui', 'editor.bold', 'Makapal'],
    ['ui', 'editor.linkUrl', 'URL'],
    ['ui', 'errors.integer', 'Maglagay ng buong bilang'],
    ['bot-options', 'genders.0', 'Lalaki'],
    ['bot-options', 'scriptTypes.0', 'Mga tanong at sagot'],
  ])('D-141 AC824-06 preserves Admin meaning at %s.%s', (file, key, expected) => {
    expect(valueAt(read('fil', file ?? ''), key ?? '')).toBe(expected);
  });

  it('D-141 AC824-15 checks all941 staged leaves against the existing Latin font cmap', () => {
    const text = FILES.flatMap((file) => strings(read('fil', file)));
    expect(text).toHaveLength(941);
    const ranges = receipt.assets.NotoSans.cmap.split(',').map((range) => {
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
