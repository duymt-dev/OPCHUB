import { DEFAULT_LOCALE, isLocale, languages } from '@opchub/shared/fixtures';

/** D-65: bộ message có bản dịch riêng; `vi` là nguồn */
export const BUNDLES = ['vi', 'en', 'zh', 'id', 'th', 'ms', 'fil', 'km', 'lo', 'my'] as const;
export type Bundle = (typeof BUNDLES)[number];

const isBundle = (v: string | undefined): v is Bundle =>
  v !== undefined && (BUNDLES as readonly string[]).includes(v);

/** Mã ngôn ngữ → bộ message (`en-SG` dùng `en`, `ms-BN` dùng `ms` theo `LANGS.dict`); lạ → `vi` */
export function bundleOf(code: string | undefined): Bundle {
  if (!isLocale(code)) return DEFAULT_LOCALE;
  const dict = languages.find((l) => l.code === code)?.dict;
  return isBundle(dict) ? dict : DEFAULT_LOCALE;
}

const INTL: Record<string, string> = {
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

/** BCP 47 cho `Intl` (định dạng số / ngày theo ngôn ngữ đang chọn) */
export const intlLocaleOf = (code: string | undefined): string =>
  (code && INTL[code]) ?? INTL[DEFAULT_LOCALE] ?? 'vi-VN';
