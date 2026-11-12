import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Complete explicit Filipino inventory, NOT the final10-bundle production gate. */
const FILES = [
  'affiliate',
  'auth',
  'bot-options',
  'bots',
  'common',
  'events',
  'fees',
  'groups',
  'investors',
  'marketing',
  'members',
  'needs',
  'meta',
  'overview',
  'projects',
  'reports',
  'requests',
  'stores',
  'ui',
  'settings/core',
  'settings/access',
  'settings/mail',
  'settings/audit',
  'settings/finance',
  'settings/ai',
] as const;

const sameTextReasons = new Map([
  ['settings/core.general.tz.ict', 'Official names in the existing time-zone option'],
  ['settings/access.admins.drawer.namePh', 'Existing proper-name example'],
  ['settings/mail.mail.sampleName', 'Existing proper-name example'],
  ['settings/finance.bank.syntaxValue', 'Canonical OPCHUB transfer-reference example (D-123)'],
  ['marketing.mail.sampleName', 'Existing proper-name example'],
  ['bots.pf.namePh', 'Existing proper-name example'],
]);

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

describe('D-141 AC824-02 complete Filipino25-file raw catalogs before fallback', () => {
  it.each(FILES)(
    '%s keeps exact source shape/keys/ICU and contains no copied Vietnamese prose',
    (file) => {
      expect(
        catalogIssues(
          read('vi', file),
          read('fil', file),
          {
            locale: 'fil',
            sameTextReasons,
            emptyTextReasons: new Map([
              ['settings/finance.renewal.actions', 'Existing blank actions header'],
            ]),
          },
          file,
        ),
      ).toEqual([]);
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
    ['events', 'status.open', 'Bukas ang pagpaparehistro'],
    ['events', 'card.list', 'Listahan ng mga dadalo'],
    ['bots', 'thread.pending', 'Naghihintay ng pagsusuri'],
    ['bots', 'pf.basic', 'PANGUNAHING IMPORMASYON'],
    ['groups', 'mod.filter.report', 'Mga report ng miyembro'],
    ['groups', 'export.cell.lecturer', 'Tagapagturo'],
    ['marketing', 'form.body', 'Nilalaman ng email'],
    ['members', 'drawer.rep', 'Kinatawan'],
    ['members', 'filters.role.expert', 'Eksperto'],
    ['projects', 'val.repoPublic', 'Pampubliko'],
    ['projects', 'val.repoPrivate', 'Pribado'],
    ['projects', 'status.pending_review', 'Naghihintay ng pagsusuri'],
    ['settings/audit', 'log.filterTag', 'Kategorya'],
    ['settings/audit', 'log.tag.report', 'Mga Ulat'],
    ['settings/audit', 'log.filterActor', 'Gumawa ng aksyon'],
    ['settings/ai', 'ai.budget', 'Buwanang badyet (VND)'],
    ['settings/ai', 'ai.customProviderLabel', 'Pasadya (katugma ng OpenAI)'],
    ['settings/finance', 'bank.content', 'Reference ng paglilipat'],
    ['settings/core', 'general.timezone', 'Time zone'],
    ['settings/access', 'admins.tfaOff', 'Hindi pa pinagana'],
  ])('D-141 AC824-06 preserves Admin meaning at %s.%s', (file, key, expected) => {
    expect(valueAt(read('fil', file ?? ''), key ?? '')).toBe(expected);
  });

  it.each([...sameTextReasons.keys()])(
    'D-141 AC824-11/12 preserves canonical example %s',
    (path) => {
      const split = path.indexOf('.');
      expect(valueAt(read('fil', path.slice(0, split)), path.slice(split + 1))).toBe(
        valueAt(read('vi', path.slice(0, split)), path.slice(split + 1)),
      );
    },
  );

  it('D-141 AC824-15 checks all2667 leaves against the existing Latin font cmap', () => {
    const text = FILES.flatMap((file) => strings(read('fil', file)));
    expect(text).toHaveLength(2667);
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
