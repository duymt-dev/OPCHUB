import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Complete explicit Lao inventory, not the final10-bundle production gate. */
const FILES = [
  'affiliate',
  'auth',
  'bot-options',
  'bots',
  'common',
  'events',
  'fees',
  'groups',
  'marketing',
  'members',
  'projects',
  'investors',
  'needs',
  'meta',
  'overview',
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
  ['settings/core.general.tz.ict', 'Existing official time-zone names'],
  ['settings/access.admins.drawer.namePh', 'Existing person-name example'],
  ['settings/mail.mail.sampleName', 'Existing person-name example'],
  ['settings/finance.bank.syntaxValue', 'Canonical OPCHUB transfer-reference example'],
  ['marketing.mail.sampleName', 'Existing person-name example'],
  ['bots.pf.namePh', 'Existing person-name example'],
]);
const NEUTRAL = new Set([
  'affiliate.policy.mediaSoft',
  'affiliate.policy.mediaAmount',
  'affiliate.dateRange',
  'auth.twoFactor.codePlaceholder',
  'bot-options.hours.0',
  'bot-options.hours.1',
  'bot-options.hours.2',
  'bot-options.hours.3',
  'investors.dateRange',
  'needs.dateRange',
  'overview.growth.delta',
  'requests.dateRange',
  'stores.dateRange',
  'ui.editor.linkUrl',
  'bots.dateRange',
  'bots.pf.namePh',
  'events.dateRange',
  'events.form.mapPh',
  'events.form.linkPh',
  'events.form.meetPh',
  'fees.dateRange',
  'groups.dateRange',
  'groups.list.stats.provincesValue',
  'groups.export.csv',
  'groups.export.xls',
  'marketing.dateRange',
  'marketing.auto.attUrl',
  'marketing.mail.brand',
  'marketing.mail.sampleName',
  'members.dateRange',
  'projects.dateRange',
  'projects.stage.mvp',
  'projects.val.none',
  'settings/access.roles.cell',
  'settings/access.admins.drawer.namePh',
  'settings/access.admins.drawer.phonePh',
  'settings/access.admins.drawer.emailPh',
  'settings/audit.log.tag.sso',
  'settings/core.tabSub.smtp',
  'settings/core.general.tz.ict',
  'settings/finance.renewal.actions',
  'settings/finance.bank.providers.casso',
  'settings/finance.bank.providers.sepay',
  'settings/finance.bank.providers.vcb',
  'settings/finance.bank.syntaxValue',
  'settings/mail.mail.sampleEmail',
  'settings/mail.mail.attUrl',
  'settings/mail.mail.brand',
  'settings/mail.mail.sampleName',
  'settings/mail.smtp.enc.tls',
  'settings/mail.smtp.enc.ssl',
  'settings/mail.smtp.keyPh',
  'settings/mail.smtp.testPh',
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

describe('D-141 AC824-02 Lao25-file complete raw catalogs before fallback', () => {
  it.each(FILES)('%s retains exact shape/keys/ICU/NFC without copied Vietnamese prose', (file) => {
    expect(
      catalogIssues(
        read('vi', file),
        read('lo', file),
        {
          locale: 'lo',
          sameTextReasons,
          emptyTextReasons: new Map([
            ['settings/finance.renewal.actions', 'Existing blank actions header'],
          ]),
        },
        file,
      ),
    ).toEqual([]);
  });

  it.each([
    ['affiliate', 'title', 'ຜູ້ແນະນຳ'],
    ['affiliate', 'pageTitle', 'ເຄືອຂ່າຍຜູ້ແນະນຳ'],
    ['affiliate', 'regional.share.director', 'ຜູ້ອຳນວຍການພາກພື້ນ'],
    ['affiliate', 'regional.share.pendingStatus', 'ລໍຖ້າຈ່າຍໃນທ້າຍເດືອນ'],
    ['auth', 'login.welcomeAdmin', 'ເຂົ້າລະບົບແດຊບອດຜູ້ດູແລ'],
    ['auth', 'login.welcomeUser', 'ສະບາຍດີ, ເຂົ້າລະບົບພອດທັລສະມາຊິກ'],
    ['auth', 'twoFactor.code', 'ລະຫັດ 6 ຫຼັກ'],
    ['auth', 'reset.hint', 'ໃຊ້ຕົວພິມໃຫຍ່, ຕົວເລກ ແລະ ອັກຂະລະພິເສດ'],
    ['common', 'adminProfile.disabled', 'ຍັງບໍ່ເປີດໃຊ້'],
    ['common', 'adminProfile.enabled', 'ເປີດໃຊ້ແລ້ວ'],
    ['common', 'nav.affiliate', 'ເຄືອຂ່າຍຜູ້ແນະນຳ'],
    ['events', 'card.list', 'ລາຍຊື່ຜູ້ເຂົ້າຮ່ວມ'],
    ['events', 'upcoming.tomorrow', 'ມື້ອື່ນ'],
    ['investors', 'kind.fund', 'ກອງທຶນລົງທຶນ'],
    ['marketing', 'form.body', 'ເນື້ອຫາອີເມວ'],
    ['marketing', 'onbMail.body', 'ເນື້ອຫາອີເມວ'],
    ['overview', 'conversion.expired', 'ໝົດອາຍຸແລະຍັງບໍ່ຈ່າຍ'],
    ['projects', 'status.pending_review', 'ລໍຖ້າກວດ'],
    ['requests', 'drawer.threadCount', 'ຄຳເຫັນ: {n} · ຜູ້ດູແລເທົ່ານັ້ນທີ່ເຫັນ'],
    ['settings/access', 'admins.tfaOff', 'ຍັງບໍ່ເປີດໃຊ້'],
    ['settings/audit', 'log.filterTag', 'ໝວດໝູ່'],
    ['settings/finance', 'bank.content', 'ຂໍ້ຄວາມອ້າງອີງການໂອນ'],
    ['ui', 'clear', 'ລ້າງ'],
    ['ui', 'permissions.affiliate.payout', 'ຈ່າຍໃຫ້ຜູ້ອຳນວຍການພາກພື້ນ'],
    ['ui', 'editor.undo', 'ຍ້ອນກັບ (Ctrl+Z)'],
    ['ui', 'editor.bulletListTitle', 'ລາຍການແບບຈຸດ'],
  ])('D-141 AC824-06 preserves Admin context at %s.%s', (file, key, expected) => {
    expect(valueAt(read('lo', file ?? ''), key ?? '')).toBe(expected);
  });

  it('D-141 AC824-02 keeps only exact neutral examples equal to English, never English filler', () => {
    const retained: string[] = [];
    for (const file of FILES) {
      const english = new Map(leaves(read('en', file)));
      for (const [key, value] of leaves(read('lo', file))) {
        const full = `${file}.${key}`;
        if (NEUTRAL.has(full)) {
          expect(value, full).toBe(english.get(key));
          retained.push(full);
        } else {
          expect(value, full).not.toBe(english.get(key));
          expect(value, full).toMatch(/\p{Script=Lao}/u);
        }
      }
    }
    expect(retained.sort()).toEqual([...NEUTRAL].sort());
  });

  it.each([...sameTextReasons.keys()])(
    'D-141 AC824-11/12 preserves canonical example %s',
    (path) => {
      const split = path.indexOf('.');
      expect(valueAt(read('lo', path.slice(0, split)), path.slice(split + 1))).toBe(
        valueAt(read('vi', path.slice(0, split)), path.slice(split + 1)),
      );
    },
  );

  it('D-141 AC824-15 covers all2667 leaves with the unchanged Lao and Latin cmaps', () => {
    const text = FILES.flatMap((file) => leaves(read('lo', file)).map(([, value]) => value));
    expect(text).toHaveLength(2667);
    const ranges = [receipt.assets.NotoSans.cmap, receipt.assets.NotoSansLao.cmap]
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
