import { isLocale, LOCALE_COOKIE, DEFAULT_LOCALE, localeNative } from '@opchub/shared/fixtures';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { bundleOf } from './locales';
import { loadMessages } from './messages';

/**
 * Ngôn ngữ theo cookie, không prefix URL (D-06). D-65: 9 bộ dịch đầy đủ cho Portal
 * (`en-SG`/`ms-BN` dùng chung `en`/`ms`); khoá thiếu rơi về tiếng Việt.
 */
export default getRequestConfig(async () => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
  const messages = await loadMessages(bundleOf(locale));
  // Nút chọn ngôn ngữ hiện tên bản ngữ của đúng mã (vd `en-SG` → English)
  const auth = { ...messages.auth, language: localeNative(locale) };
  return { locale, timeZone: 'Asia/Ho_Chi_Minh', messages: { ...messages, auth } };
});
