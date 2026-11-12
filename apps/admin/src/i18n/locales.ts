import { DEFAULT_LOCALE, isLocale } from '@opchub/shared/fixtures';
import type { LocaleProfile } from './types';

/** D-141: 12 selector identities, 10 message bundles. Never interpolate unchecked cookies. */
export const BUNDLES = ['vi', 'en', 'zh', 'id', 'th', 'ms', 'fil', 'km', 'lo', 'my'] as const;
export type Bundle = (typeof BUNDLES)[number];

const PROFILES = {
  vi: { intl: 'vi-VN', dayjs: 'vi', antd: 'vi_VN' },
  en: { intl: 'en-GB', dayjs: 'en-gb', antd: 'en_GB' },
  'en-SG': { intl: 'en-SG', dayjs: 'en-gb', antd: 'en_GB' },
  zh: { intl: 'zh-CN', dayjs: 'zh-cn', antd: 'zh_CN' },
  id: { intl: 'id-ID', dayjs: 'id', antd: 'id_ID' },
  th: { intl: 'th-TH', dayjs: 'th', antd: 'th_TH' },
  ms: { intl: 'ms-MY', dayjs: 'ms', antd: 'ms_MY' },
  'ms-BN': { intl: 'ms-BN', dayjs: 'ms', antd: 'ms_MY' },
  fil: { intl: 'fil-PH', dayjs: 'tl-ph', antd: 'fil' },
  km: { intl: 'km-KH', dayjs: 'km', antd: 'km_KH' },
  lo: { intl: 'lo-LA', dayjs: 'lo', antd: 'lo' },
  my: { intl: 'my-MM', dayjs: 'my', antd: 'my_MM' },
} satisfies Record<string, LocaleProfile>;

type SelectedLocale = keyof typeof PROFILES;

export function selectedLocaleOf(code: string | undefined): SelectedLocale {
  return isLocale(code) && Object.hasOwn(PROFILES, code)
    ? (code as SelectedLocale)
    : DEFAULT_LOCALE;
}

export function bundleOf(code: string | undefined): Bundle {
  const locale = selectedLocaleOf(code);
  if (locale === 'en-SG') return 'en';
  if (locale === 'ms-BN') return 'ms';
  return locale;
}

export const localeProfileOf = (code: string | undefined): LocaleProfile => ({
  ...PROFILES[selectedLocaleOf(code)],
});
export const intlLocaleOf = (code: string | undefined) => localeProfileOf(code).intl;
