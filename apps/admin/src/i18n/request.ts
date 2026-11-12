import { LOCALE_COOKIE } from '@opchub/shared/fixtures';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { loadMessages } from './message-loader';
import { selectedLocaleOf } from './locales';
import { prepareAdminIntl } from './intl/runtime';

/**
 * D-141: resolve a single complete logical catalog per request, without locale URL prefixes.
 * Runtime fallback is not proof of translation completeness; the raw-catalog gate owns that check.
 */
export default getRequestConfig(async () => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = selectedLocaleOf(saved);
  await prepareAdminIntl(locale);
  return { locale, timeZone: 'Asia/Ho_Chi_Minh', messages: await loadMessages(locale) };
});
