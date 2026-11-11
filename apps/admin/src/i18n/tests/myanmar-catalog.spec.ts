import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Staged17-file raw inventory; eight business files/final10-bundle gate remain required. */
const FILES = [
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
const NEUTRAL = new Map([
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

describe('D-141 AC824-02 staged Myanmar17-file raw catalogs before fallback', () => {
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

  it('D-141 AC824-02 permits only31 exact neutral examples, not English filler or fake Latin Myanmar', () => {
    const retained: string[] = [];
    for (const file of FILES) {
      const source = new Map(leaves(read('vi', file))),
        english = new Map(leaves(read('en', file)));
      for (const [key, value] of leaves(read('my', file))) {
        const full = `${file}.${key}`;
        if (NEUTRAL.has(full)) {
          expect(value, full).toBe(source.get(key));
          expect(value, full).toBe(english.get(key));
          retained.push(full);
        } else {
          expect(value, full).not.toBe(english.get(key));
          expect(value, full).toMatch(/\p{Script=Myanmar}/u);
        }
      }
    }
    expect(retained).toHaveLength(31);
    expect(retained.sort()).toEqual([...NEUTRAL.keys()].sort());
  });

  it.each([
    ['settings/core', 'general.tz.ict'],
    ['settings/access', 'admins.drawer.namePh'],
    ['settings/mail', 'mail.sampleName'],
    ['settings/finance', 'bank.syntaxValue'],
  ])('D-141 AC824-11/12 preserves canonical example %s.%s', (file, key) => {
    expect(valueAt(read('my', file ?? ''), key ?? '')).toBe(
      valueAt(read('vi', file ?? ''), key ?? ''),
    );
  });

  it('D-141 AC824-15 covers all1260 staged leaves with unchanged Myanmar/Latin font cmaps', () => {
    const text = FILES.flatMap((file) => leaves(read('my', file)).map(([, value]) => value));
    expect(text).toHaveLength(1260);
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
