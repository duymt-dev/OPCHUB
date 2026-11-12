import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Fixed complete25-file raw inventory, not the final10-bundle production gate. */
const FILES = [
  'affiliate',
  'bots',
  'events',
  'fees',
  'groups',
  'marketing',
  'members',
  'projects',
  'auth',
  'bot-options',
  'common',
  'investors',
  'meta',
  'needs',
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
const ENGLISH_EXAMPLE_VARIANTS = new Map([
  ['affiliate.policy.mediaAmount', 'Media Soft {amount}'],
  ['groups.form.roomNamePh', 'room-name'],
]);
const NEUTRAL = new Map([
  ['affiliate.policy.mediaSoft', 'Unchanged Media Soft brand'],
  ['affiliate.policy.mediaAmount', 'Unchanged MS brand/amount expression'],
  ['affiliate.dateRange', 'Canonical date-range example'],
  ['bots.dateRange', 'Canonical date-range example'],
  ['bots.pf.namePh', 'Existing person-name example'],
  ['events.dateRange', 'Canonical date-range example'],
  ['events.form.mapPh', 'Canonical map URL example'],
  ['events.form.linkPh', 'Canonical meeting URL example'],
  ['events.form.meetPh', 'Canonical Google Meet URL example'],
  ['fees.dateRange', 'Canonical date-range example'],
  ['groups.dateRange', 'Canonical date-range example'],
  ['groups.form.roomNamePh', 'Canonical room slug example'],
  ['groups.export.csv', 'Unchanged CSV file-format label'],
  ['groups.export.xls', 'Unchanged Excel file-format label'],
  ['marketing.dateRange', 'Canonical date-range example'],
  ['marketing.auto.attUrl', 'Canonical attachment URL example'],
  ['marketing.mail.brand', 'Unchanged public domain'],
  ['marketing.mail.sampleName', 'Existing person-name example'],
  ['members.dateRange', 'Canonical date-range example'],
  ['projects.dateRange', 'Canonical date-range example'],
  ['projects.stage.mvp', 'Canonical MVP stage label'],
  ['projects.val.none', 'Existing empty-value dash'],
  ['auth.twoFactor.codePlaceholder', 'Canonical six-digit numeric example'],
  ['bot-options.hours.0', 'Canonical time-range example'],
  ['bot-options.hours.1', 'Canonical time-range example'],
  ['bot-options.hours.2', 'Canonical time-range example'],
  ['bot-options.hours.3', 'Canonical time-range example'],
  ['investors.dateRange', 'Existing numeric date-range example'],
  ['meta.default', 'Unchanged required OPC Hub Admin brand'],
  ['needs.dateRange', 'Existing numeric date-range example'],
  ['overview.growth.delta', 'Numeric percent-point ICU expression'],
  ['requests.dateRange', 'Existing numeric date-range example'],
  ['stores.dateRange', 'Existing numeric date-range example'],
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
  ['settings/audit.log.tag.sso', 'Canonical SSO abbreviation'],
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

describe('D-141 AC824-02 complete Myanmar25-file raw catalogs before fallback', () => {
  it.each(FILES)('%s preserves shape/keys/ICU/NFC with no copied Vietnamese prose', (file) => {
    expect(
      catalogIssues(
        read('vi', file),
        read('my', file),
        {
          locale: 'my',
          sameTextReasons: NEUTRAL,
          emptyTextReasons: new Map([
            ['settings/finance.renewal.actions', 'Existing blank header'],
          ]),
        },
        file,
      ),
    ).toEqual([]);
  });

  it.each([
    ['affiliate', 'title', 'မိတ်ဆက်သူ'],
    ['affiliate', 'pageTitle', 'မိတ်ဆက်သူကွန်ရက်'],
    ['affiliate', 'regional.share.affiliates', 'မိတ်ဆက်သူ'],
    ['affiliate', 'tabs.aff', 'မိတ်ဆက်သူ'],
    ['affiliate', 'columns.affiliate', 'မိတ်ဆက်သူ'],
    ['affiliate', 'regional.title', 'ဒေသဒါရိုက်တာ ဆက်တင်များ'],
    ['affiliate', 'columns.monthStatus', 'လအတွက် အခြေအနေ'],
    ['bots', 'card.title', 'အသိုင်းအဝိုင်း အပြန်အလှန်ဆက်ဆံရေးဘော့'],
    ['bots', 'replies.assignmentPending', 'ပြန်ဖြေသည့်အခါ ရွေးမည်'],
    ['events', 'form.name', 'ပွဲအမည်'],
    ['events', 'form.meet', 'Google Meet လင့်ခ်'],
    ['fees', 'status.regional_director', 'အခမဲ့ · ဒေသဒါရိုက်တာ'],
    ['groups', 'export.statusLocked', 'လော့ခ်ချထားသည်'],
    ['groups', 'export.cell.locked', 'လော့ခ်ချထားသည်'],
    ['groups', 'mod.filter.report', 'အဖွဲ့ဝင်တိုင်ကြားမှု'],
    ['members', 'status.locked', 'လော့ခ်ချထားသည်'],
    ['members', 'filters.st.locked', 'လော့ခ်ချထားသည်'],
    ['projects', 'val.repoPublic', 'အများပြည်သူ'],
    ['projects', 'val.repoPrivate', 'သီးသန့်'],
    ['auth', 'login.submit', 'အကောင့်ဝင်ရန်'],
    ['auth', 'login.welcomeAdmin', 'စီမံခန့်ခွဲမှုဒက်ရှ်ဘုတ်သို့ အကောင့်ဝင်ရန်'],
    ['auth', 'login.welcomeUser', 'မင်္ဂလာပါ၊ အဖွဲ့ဝင်ပေါ်တယ်သို့ အကောင့်ဝင်ပါ'],
    ['auth', 'twoFactor.code', 'ဂဏန်း ၆ လုံးကုဒ်'],
    ['bot-options', 'tones.3', 'စိတ်အားတက်ကြွစေသော'],
    ['common', 'adminProfile.enabled', 'အသက်သွင်းပြီးပြီ'],
    ['common', 'adminProfile.disabled', 'အသက်မသွင်းရသေးပါ'],
    ['common', 'nav.reports', 'အစီရင်ခံစာများ'],
    ['common', 'nav.affiliate', 'မိတ်ဆက်သူကွန်ရက်'],
    ['common', 'adminProfile.role', 'လက်ရှိအခန်းကဏ္ဍ'],
    ['investors', 'kind.fund', 'ရင်းနှီးမြှုပ်နှံမှု ရန်ပုံငွေအဖွဲ့'],
    ['investors', 'drawer.projects', 'စိတ်ဝင်စားခဲ့သော စီမံကိန်းများ ({n})'],
    ['meta', 'affiliate', 'မိတ်ဆက်သူ'],
    ['meta', 'reports', 'အစီရင်ခံစာများ'],
    ['meta', 'profile', 'ကိုယ်ရေးပရိုဖိုင်'],
    ['needs', 'type.sell', 'ရောင်းချရာ လိုသည်'],
    ['overview', 'conversion.expired', 'သက်တမ်းကုန်၍ မပေးရသေး'],
    ['overview', 'conversion.director', 'ဒေသဒါရိုက်တာ'],
    ['overview', 'stats.membersRangeDelta', 'ရွေးထားသောကာလအတွင်း +{pct}%'],
    ['reports', 'title', 'အစီရင်ခံစာများ'],
    ['reports', 'metric.commission', 'ဖြစ်ပေါ်လာသော မိတ်ဆက်သူကော်မရှင် (đ)'],
    ['requests', 'drawer.threadCount', 'မှတ်ချက် {n} ခု · စီမံခန့်ခွဲသူများသာ မြင်နိုင်သည်'],
    ['requests', 'catalog.used', 'တောင်းဆိုမှု {n} ခု'],
    ['stores', 'drawer.hide', 'ဆိုင် ဖျောက်ရန်'],
    ['ui', 'permissions.affiliate.payout', 'ဒေသဒါရိုက်တာအား ငွေပေးချေရန်'],
    ['ui', 'regions.central', 'အလယ်ပိုင်း'],
    ['ui', 'regions.centralDirector', 'အလယ်ပိုင်းနှင့် အလယ်ပိုင်းကုန်းမြင့်ဒေသ'],
    ['ui', 'permissionMenus.affiliate', 'မိတ်ဆက်သူ'],
    ['ui', 'editor.orderedListTitle', 'နံပါတ်စဉ်စာရင်း'],
    [
      'ui',
      'errors.adminPasswordRule',
      'စကားဝှက်အသစ်တွင် စာလုံးအကြီးနှင့် ဂဏန်းပါဝင်ပြီး အနည်းဆုံး အက္ခရာ ၈ လုံး ရှိရမည်',
    ],
    ['settings/core', 'general.heading', 'ပလက်ဖောင်းအချက်အလက်'],
    ['settings/core', 'general.otp', 'စာရင်းသွင်းချိန်တွင် OTP ဖြင့် အီးမေးလ်အတည်ပြုရန်'],
    ['settings/access', 'admins.tfaOff', 'မဖွင့်ရသေးပါ'],
    ['settings/access', 'admins.locked', 'လော့ခ်ချထားသည်'],
    ['settings/mail', 'mail.heading', 'ကြိုဆိုသည့် အီးမေးလ်'],
    ['settings/audit', 'log.heading', 'စီမံခန့်ခွဲမှု လုပ်ဆောင်ချက်မှတ်တမ်း'],
    ['settings/finance', 'renewal.heading', 'အလိုအလျောက် သက်တမ်းတိုးသတိပေးခြင်း'],
    ['settings/finance', 'bank.content', 'ငွေလွှဲအကြောင်းအရာ'],
    ['settings/ai', 'ai.customProviderLabel', 'စိတ်ကြိုက် (OpenAI နှင့် ကိုက်ညီသော)'],
    ['settings/ai', 'aiCalls.title', 'AI ခေါ်ဆိုမှုမှတ်တမ်း'],
    ['settings/ai', 'app.renew', 'အစီအစဉ် သက်တမ်းတိုးသတိပေးချက်များ'],
    [
      'settings/ai',
      'ai.budgetAlert',
      'သတ်မှတ်အတိုင်းအတာသို့ ရောက်ချိန် သို့မဟုတ် ဘတ်ဂျက်ကုန်ချိန်တွင် စီမံခန့်ခွဲမှု၌ သတိပေးသည်။ အီးမေးလ် မပို့ပါ။',
    ],
  ])('D-141 AC824-06 keeps reviewed Admin context %s.%s', (file, key, expected) => {
    expect(valueAt(read('my', file ?? ''), key ?? '')).toBe(expected);
  });

  it('D-141 AC824-02 permits only53 exact neutral examples, not English filler or fake Latin Myanmar', () => {
    const retained: string[] = [];
    for (const file of FILES) {
      const source = new Map(leaves(read('vi', file))),
        english = new Map(leaves(read('en', file)));
      for (const [key, value] of leaves(read('my', file))) {
        const full = `${file}.${key}`;
        if (NEUTRAL.has(full)) {
          expect(value, full).toBe(source.get(key));
          // Canonical source examples stay unchanged even when English spells out a brand.
          expect(english.get(key), full).toBe(ENGLISH_EXAMPLE_VARIANTS.get(full) ?? value);
          retained.push(full);
        } else {
          expect(value, full).not.toBe(english.get(key));
          expect(value, full).toMatch(/\p{Script=Myanmar}/u);
        }
      }
    }
    expect(retained).toHaveLength(53);
    expect(retained.sort()).toEqual([...NEUTRAL.keys()].sort());
  });

  it('D-141 AC824-02 retains three separate translated topic examples, not a collapsed placeholder', () => {
    expect(valueAt(read('my', 'bots'), 'bulk.topicsPlaceholder')).toBe(
      'OPC အတွက် အီလက်ထရွန်နစ်ငွေတောင်းခံလွှာ\nစိုက်ပျိုးထွက်ကုန်များအတွက် ဈေးကွက် ရှာခြင်း\nဖောက်သည်ဝန်ဆောင်မှုတွင် AI အသုံးပြုခြင်း',
    );
  });

  it.each([
    ['bots', 'pf.namePh'],
    ['events', 'form.mapPh'],
    ['events', 'form.linkPh'],
    ['events', 'form.meetPh'],
    ['groups', 'form.roomNamePh'],
    ['marketing', 'mail.sampleName'],
    ['settings/core', 'general.tz.ict'],
    ['settings/access', 'admins.drawer.namePh'],
    ['settings/mail', 'mail.sampleName'],
    ['settings/finance', 'bank.syntaxValue'],
  ])('D-141 AC824-11/12 preserves canonical example %s.%s', (file, key) => {
    expect(valueAt(read('my', file ?? ''), key ?? '')).toBe(
      valueAt(read('vi', file ?? ''), key ?? ''),
    );
  });

  it('D-141 AC824-15 covers all2667 leaves with unchanged Myanmar/Latin font cmaps', () => {
    const text = FILES.flatMap((file) => leaves(read('my', file)).map(([, value]) => value));
    expect(text).toHaveLength(2667);
    const ranges = [receipt.assets.NotoSans.cmap, receipt.assets.NotoSansMyanmar.cmap]
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
