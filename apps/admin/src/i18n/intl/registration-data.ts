import type { DateData, NumberData } from './types';

// Official package locale modules buffer data when no global polyfill is installed.
// Do not install a global polyfill or remove data another package consumer might need.
type RegistrationBuffers = typeof globalThis & {
  __FORMATJS_DATETIMEFORMAT_DATA__?: DateData[];
  __FORMATJS_NUMBERFORMAT_DATA__?: NumberData[];
};

export function registrationData(locale: 'km' | 'lo' | 'my') {
  const buffers = globalThis as RegistrationBuffers;
  const date = buffers.__FORMATJS_DATETIMEFORMAT_DATA__?.find((data) => data.locale === locale);
  const number = buffers.__FORMATJS_NUMBERFORMAT_DATA__?.find((data) => data.locale === locale);
  if (!date || !number) throw new Error(`Admin Intl locale data unavailable: ${locale}`);
  return { date, number };
}
