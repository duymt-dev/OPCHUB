import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import receipt from '../font-assets.json';
import { catalogIssues } from './message-contract';

/** Complete explicit Thai inventory, not the final10-bundle production gate. */
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

describe('D-141 AC824-02 Thai25-file complete raw catalogs before fallback', () => {
  it.each(FILES)('%s retains exact shape/keys/ICU/NFC without copied Vietnamese prose', (file) => {
    expect(
      catalogIssues(
        read('vi', file),
        read('th', file),
        {
          locale: 'th',
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
    ['affiliate', 'title', 'แอฟฟิลิเอต'],
    ['affiliate', 'pageTitle', 'เครือข่ายแอฟฟิลิเอต'],
    ['affiliate', 'regional.share.director', 'ผู้อำนวยการภูมิภาค'],
    ['affiliate', 'regional.share.pendingStatus', 'รอจ่ายเมื่อสิ้นเดือน'],
    ['affiliate', 'noRegion', 'ยังไม่ได้กำหนดภูมิภาค · Media Soft 100%'],
    ['auth', 'login.welcomeAdmin', 'เข้าสู่แดชบอร์ดผู้ดูแล'],
    ['auth', 'login.welcomeUser', 'สวัสดี เข้าสู่พอร์ทัลสมาชิก'],
    ['auth', 'twoFactor.code', 'รหัส 6 หลัก'],
    ['auth', 'reset.hint', 'ใช้ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ'],
    ['bot-options', 'scriptTypes.3', 'แนะนำกิจกรรม / โครงการ'],
    ['common', 'adminProfile.disabled', 'ยังไม่เปิดใช้งาน'],
    ['common', 'adminProfile.enabled', 'เปิดใช้งานแล้ว'],
    ['common', 'adminProfile.emailHint', 'อีเมลที่ผู้ดูแลกำหนดให้'],
    ['common', 'nav.affiliate', 'เครือข่ายแอฟฟิลิเอต'],
    ['common', 'nav.reports', 'รายงาน'],
    ['investors', 'title', 'นักลงทุน'],
    ['investors', 'kind.fund', 'กองทุนลงทุน'],
    ['needs', 'table.store', 'ร้านค้า'],
    ['meta', 'projects', 'โครงการ'],
    ['meta', 'affiliate', 'แอฟฟิลิเอต'],
    ['overview', 'title', 'ภาพรวม'],
    ['overview', 'conversion.paid', 'ชำระแล้ว'],
    ['overview', 'conversion.expired', 'หมดอายุและยังไม่ชำระ'],
    ['reports', 'title', 'รายงาน'],
    ['requests', 'drawer.thread', 'การสนทนาภายใน'],
    ['requests', 'drawer.threadCount', 'ความคิดเห็น: {n} · ผู้ดูแลเท่านั้นที่เห็น'],
    ['stores', 'table.store', 'ร้านค้า'],
    ['events', 'card.list', 'รายชื่อผู้เข้าร่วม'],
    ['events', 'upcoming.tomorrow', 'พรุ่งนี้'],
    ['bots', 'thread.pending', 'รอตรวจสอบ'],
    ['groups', 'export.cell.lecturer', 'วิทยากร'],
    ['groups', 'mod.cat.personal_info', 'ข้อมูลส่วนตัว'],
    ['marketing', 'form.body', 'เนื้อหาอีเมล'],
    ['marketing', 'onbMail.body', 'เนื้อหาอีเมล'],
    ['members', 'drawer.rep', 'ผู้แทน'],
    ['projects', 'col.project', 'โครงการ'],
    ['projects', 'col.owner', 'เจ้าของโครงการ'],
    ['projects', 'val.repoPublic', 'สาธารณะ'],
    ['projects', 'val.repoPrivate', 'ส่วนตัว'],
    ['settings/audit', 'log.filterTag', 'หมวดหมู่'],
    ['settings/audit', 'log.tag.content', 'เนื้อหา'],
    ['settings/ai', 'ai.customProviderLabel', 'กำหนดเอง (รองรับ OpenAI)'],
    ['settings/access', 'admins.tfaOff', 'ยังไม่เปิดใช้งาน'],
    ['settings/core', 'general.timezone', 'เขตเวลา'],
    ['settings/finance', 'bank.content', 'ข้อความอ้างอิงการโอน'],
    ['ui', 'clear', 'ล้าง'],
    ['ui', 'regions.centralDirector', 'ภาคกลางและที่ราบสูงตอนกลาง'],
    ['ui', 'permissions.affiliate.payout', 'จ่ายเงินให้ผู้อำนวยการภูมิภาค'],
    ['ui', 'calendar.week', '7 วันที่ผ่านมา'],
    ['ui', 'editor.linkInvalid', 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'],
  ])('D-141 AC824-06 preserves Admin context at %s.%s', (file, key, expected) => {
    expect(valueAt(read('th', file ?? ''), key ?? '')).toBe(expected);
  });

  it('D-141 AC824-02 keeps only exact neutral examples equal to English, never English filler', () => {
    const retained: string[] = [];
    for (const file of FILES) {
      const english = new Map(leaves(read('en', file)));
      for (const [key, value] of leaves(read('th', file))) {
        const full = `${file}.${key}`;
        if (NEUTRAL.has(full)) {
          expect(value, full).toBe(english.get(key));
          retained.push(full);
        } else {
          expect(value, full).not.toBe(english.get(key));
          expect(value, full).toMatch(/\p{Script=Thai}/u);
        }
      }
    }
    expect(retained.sort()).toEqual([...NEUTRAL].sort());
  });

  it.each([...sameTextReasons.keys()])(
    'D-141 AC824-11/12 preserves canonical example %s',
    (path) => {
      const split = path.indexOf('.');
      expect(valueAt(read('th', path.slice(0, split)), path.slice(split + 1))).toBe(
        valueAt(read('vi', path.slice(0, split)), path.slice(split + 1)),
      );
    },
  );

  it('D-141 AC824-15 covers all2667 leaves with the unchanged Thai and Latin cmaps', () => {
    const text = FILES.flatMap((file) => leaves(read('th', file)).map(([, value]) => value));
    expect(text).toHaveLength(2667);
    const ranges = [receipt.assets.NotoSans.cmap, receipt.assets.NotoSansThai.cmap]
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
