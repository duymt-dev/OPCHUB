import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { CORE_LOCALES } from './core-labels';

export { CORE_LOCALES };
export type ControlLocale = (typeof CORE_LOCALES)[number];
const text = z.string().min(1);
const uiSchema = z.object({
  close: text,
  pagination: z.object({ page: text, pageSize: text, perPage: text, range: text }),
  bulk: z.object({ aria: text }),
  calendar: z.object({ today: text, week: text, days30: text, month: text, previousMonth: text }),
  editor: z.object({
    undo: text,
    redo: text,
    heading: text,
    paragraph: text,
    bold: text,
    italic: text,
    underline: text,
    strike: text,
    bulletListTitle: text,
    orderedListTitle: text,
    quote: text,
    linkTitle: text,
    clear: text,
    linkUrl: text,
    linkInsert: text,
    linkCancel: text,
    linkInvalid: text,
  }),
});
const memberSchema = z.object({
  col: z.object({ select: text }),
  pager: z.object({ unit: text, prev: text, next: text, pageSize: text }),
  bulk: z.object({ unit: text, selected: text, clear: text }),
});
const eventsSchema = z.object({
  toolbar: z.object({ create: text }),
  form: z.object({ createTitle: text, desc: text, close: text, cancel: text }),
});
const aiSchema = z.object({
  aiCalls: z.object({ title: text, from: text, to: text, view: text }),
});
const INTL: Record<ControlLocale, string> = {
  vi: 'vi-VN',
  en: 'en-GB',
  'en-SG': 'en-SG',
  zh: 'zh-CN',
  id: 'id-ID',
  th: 'th-TH',
  ms: 'ms-MY',
  'ms-BN': 'ms-BN',
  fil: 'fil-PH',
  km: 'km-KH',
  lo: 'lo-LA',
  my: 'my-MM',
};
// Exact installed native locale contracts; fil/lo are reviewed explicit custom-label receipts.
const CALENDAR = {
  vi: ['Tháng sau', 'Tháng trước', 'Chọn năm', 'Trống'],
  en: ['Next month', 'Previous month', 'Choose a year', 'No data'],
  zh: ['下个月', '上个月', '选择年份', '暂无数据'],
  id: ['Bulan selanjutnya', 'Bulan sebelumnya', 'Pilih satu tahun', 'Tidak ada data'],
  th: ['เดือนถัดไป', 'เดือนก่อนหน้า', 'เลือกปี', 'ไม่มีข้อมูล'],
  ms: ['Bulan depan', 'Bulan lepas', 'Pilih tahun', 'Tiada data'],
  fil: ['Susunod na buwan', 'Nakaraang buwan', 'Pumili ng taon', 'Walang datos'],
  km: ['ខែបន្ទាប់', 'ខែមុន', 'ជ្រើសរើសឆ្នាំ', 'គ្មានទិន្នន័យ'],
  lo: ['ເດືອນຕໍ່ໄປ', 'ເດືອນກ່ອນ', 'ເລືອກປີ', 'ບໍ່ມີຂໍ້ມູນ'],
  my: ['နောက်လ', 'ယခင်လ', 'နှစ်ကိုရွေး', 'ဒေတာမရှိပါ။'],
} as const;

export function controlLabels(locale: ControlLocale) {
  const bundle = locale === 'en-SG' ? 'en' : locale === 'ms-BN' ? 'ms' : locale;
  const raw = (file: string): unknown =>
    JSON.parse(
      readFileSync(
        new URL(`../../../apps/admin/messages/${bundle}/${file}.json`, import.meta.url),
        'utf8',
      ),
    ) as unknown;
  return {
    ui: uiSchema.parse(raw('ui')),
    members: memberSchema.parse(raw('members')),
    events: eventsSchema.parse(raw('events')),
    ai: aiSchema.parse(raw('settings/ai')),
    calendar: CALENDAR[bundle],
    // Installed zh_CN uses Gregorian YYYY plus the localized year suffix, not a different era.
    calendarYear: bundle === 'zh' ? '2026年' : '2026',
    number: (value: number) => new Intl.NumberFormat(INTL[locale]).format(value),
  };
}
export type ControlLabels = ReturnType<typeof controlLabels>;
/** Only the explicitly plain-number/text message templates used by these controls; not an ICU parser. */
export function insert(template: string, values: Record<string, string>) {
  for (const [key, value] of Object.entries(values))
    template = template.replaceAll(`{${key}}`, value);
  if (/\{[a-z]+\}/i.test(template)) throw new Error('Unreplaced explicit control argument');
  return template;
}
