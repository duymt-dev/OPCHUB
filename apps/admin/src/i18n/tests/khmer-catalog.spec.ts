import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Complete explicit Khmer inventory, not the final10-bundle production gate. */
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
  'affiliate',
  'bots',
  'events',
  'fees',
  'groups',
  'marketing',
  'members',
  'projects',
  'settings/core',
  'settings/access',
  'settings/mail',
  'settings/finance',
  'settings/ai',
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
  ['affiliate.policy.mediaSoft', 'Unchanged Media Soft brand'],
  ['affiliate.dateRange', 'Existing numeric date-range example'],
  ['bots.dateRange', 'Existing numeric date-range example'],
  ['bots.pf.namePh', 'Existing person-name example'],
  ['events.dateRange', 'Existing numeric date-range example'],
  ['events.form.mapPh', 'Canonical map URL example'],
  ['events.form.linkPh', 'Canonical meeting URL example'],
  ['events.form.meetPh', 'Canonical Google Meet URL example'],
  ['fees.dateRange', 'Existing numeric date-range example'],
  ['groups.dateRange', 'Existing numeric date-range example'],
  ['groups.list.stats.provincesValue', 'Numeric province-count ICU expression'],
  ['groups.export.csv', 'Canonical CSV format'],
  ['groups.export.xls', 'Canonical Excel format'],
  ['marketing.dateRange', 'Existing numeric date-range example'],
  ['marketing.auto.attUrl', 'Canonical URL example'],
  ['marketing.mail.brand', 'Unchanged public domain'],
  ['marketing.mail.sampleName', 'Existing person-name example'],
  ['members.dateRange', 'Existing numeric date-range example'],
  ['projects.dateRange', 'Existing numeric date-range example'],
  ['projects.stage.mvp', 'Canonical MVP abbreviation'],
  ['projects.val.none', 'Existing empty-value display marker'],
  ['settings/core.tabSub.smtp', 'Unchanged Brevo provider brand'],
  ['settings/core.general.tz.ict', 'Existing official timezone-name example'],
  ['settings/access.roles.cell', 'Permission/role ICU separator expression'],
  ['settings/access.admins.drawer.namePh', 'Existing person-name example'],
  ['settings/access.admins.drawer.phonePh', 'Existing numeric phone example'],
  ['settings/access.admins.drawer.emailPh', 'Existing email example'],
  ['settings/mail.mail.sampleEmail', 'Existing email example'],
  ['settings/mail.mail.attUrl', 'Canonical URL example'],
  ['settings/mail.mail.brand', 'Unchanged public domain'],
  ['settings/mail.mail.sampleName', 'Existing person-name example'],
  ['settings/mail.smtp.enc.tls', 'Canonical STARTTLS port example'],
  ['settings/mail.smtp.enc.ssl', 'Canonical SSL/TLS port example'],
  ['settings/mail.smtp.keyPh', 'Existing masked SMTP-key placeholder'],
  ['settings/mail.smtp.testPh', 'Existing email example'],
  ['settings/finance.renewal.actions', 'Existing intentionally blank actions header'],
  ['settings/finance.bank.providers.casso', 'Unchanged Casso provider brand'],
  ['settings/finance.bank.providers.sepay', 'Unchanged SePay provider brand'],
  ['settings/finance.bank.providers.vcb', 'Unchanged Vietcombank provider brand'],
  ['settings/finance.bank.syntaxValue', 'Canonical OPCHUB transfer-reference example'],
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

describe('D-141 AC824-02 Khmer25-file raw catalogs before fallback', () => {
  it.each(FILES)('%s retains shape/keys/ICU/NFC without copied Vietnamese prose', (file) => {
    expect(
      catalogIssues(
        read('vi', file),
        read('km', file),
        {
          locale: 'km',
          sameTextReasons: NEUTRAL,
          emptyTextReasons: new Map([
            ['settings/finance.renewal.actions', 'Existing intentionally blank actions header'],
          ]),
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
    ['affiliate', 'regional.share.pendingStatus', 'រង់ចាំបង់នៅចុងខែ'],
    ['affiliate', 'regional.share.director', 'នាយកតំបន់'],
    ['affiliate', 'regionalPays', 'នាយកតំបន់បង់'],
    ['bots', 'bulk.title', 'បង្កើតសេណារីយ៉ូសន្ទនាជាក្រុមដោយ AI'],
    ['bots', 'pf.role', 'តួនាទី / មុខរបរ'],
    ['bots', 'tabs.log', 'កំណត់ហេតុស្វ័យប្រវត្តិ'],
    ['events', 'card.list', 'បញ្ជីអ្នកចូលរួម'],
    ['events', 'upcoming.tomorrow', 'ថ្ងៃស្អែក'],
    ['fees', 'txn.dialog.mode', 'ផ្គូផ្គងទៅ'],
    ['groups', 'mod.aiPending', 'រង់ចាំអ្នកគ្រប់គ្រងដោះស្រាយ · មិនទាន់គិតជាការរំលោភបំពាន'],
    ['marketing', 'form.body', 'មាតិកាអ៊ីមែល'],
    ['members', 'filters.prof.inc', 'មិនទាន់ប្រកាសព័ត៌មាន'],
    ['projects', 'status.pending_review', 'រង់ចាំការអនុម័ត'],
    ['settings/core', 'general.heading', 'ព័ត៌មានវេទិកា'],
    ['settings/access', 'admins.tfaOff', 'មិនទាន់បើក'],
    ['settings/mail', 'mail.heading', 'អ៊ីមែលស្វាគមន៍'],
    ['settings/finance', 'renewal.heading', 'ការរំលឹកបន្តសមាជិកភាពដោយស្វ័យប្រវត្តិ'],
    ['settings/finance', 'bank.content', 'ខ្លឹមសារផ្ទេរប្រាក់'],
    ['settings/ai', 'ai.customProviderLabel', 'ផ្ទាល់ខ្លួន (ឆបគ្នាជាមួយ OpenAI)'],
    ['settings/ai', 'aiCalls.title', 'កំណត់ហេតុហៅ AI'],
  ])('D-141 AC824-06 preserves reviewed Admin context %s.%s', (file, key, expected) => {
    expect(valueAt(read('km', file ?? ''), key ?? '')).toBe(expected);
  });

  it('D-141 AC824-02 keeps only exact neutral examples equal to English, never English filler', () => {
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

  it.each([
    ['bots', 'pf.namePh'],
    ['marketing', 'mail.sampleName'],
    ['settings/core', 'general.tz.ict'],
    ['settings/access', 'admins.drawer.namePh'],
    ['settings/mail', 'mail.sampleName'],
    ['settings/finance', 'bank.syntaxValue'],
  ])('D-141 AC824-11/12 preserves canonical example %s.%s', (file, key) => {
    expect(valueAt(read('km', file ?? ''), key ?? '')).toBe(
      valueAt(read('vi', file ?? ''), key ?? ''),
    );
  });

  it('D-141 AC824-02 preserves the three-line topic example rather than literal escaped newline text', () => {
    const example = valueAt(read('km', 'bots'), 'bulk.topicsPlaceholder');
    expect(typeof example).toBe('string');
    expect(String(example).split('\n')).toHaveLength(3);
    expect(String(example)).not.toContain('\\n');
  });

  it('D-141 AC824-15 covers all2667 leaves with unchanged Khmer/Latin cmaps', () => {
    const text = FILES.flatMap((file) => leaves(read('km', file)).map(([, value]) => value));
    expect(text).toHaveLength(2667);
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
