import { authOverrides, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@opchub/shared/fixtures';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { messages } from './messages';

/**
 * Ngôn ngữ theo cookie, không prefix URL (D-06). Bản dịch đầy đủ mới có tiếng Việt;
 * ngôn ngữ khác chỉ phủ các chuỗi màn đăng nhập mà prototype đã dịch, còn lại giữ tiếng Việt.
 */
export default getRequestConfig(async () => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
  if (locale === DEFAULT_LOCALE) return { locale, timeZone: 'Asia/Ho_Chi_Minh', messages };
  const o = authOverrides(locale);
  const auth = {
    ...messages.auth,
    language: o.languageNative,
    login: { ...messages.auth.login, ...o.login },
  };
  return { locale, timeZone: 'Asia/Ho_Chi_Minh', messages: { ...messages, auth } };
});
