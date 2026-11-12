import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import viUi from '../../../messages/vi/ui.json';
import enUi from '../../../messages/en/ui.json';
import viAffiliate from '../../../messages/vi/affiliate.json';
import enAffiliate from '../../../messages/en/affiliate.json';
import viBots from '../../../messages/vi/bots.json';
import enBots from '../../../messages/en/bots.json';
import viSettingsCore from '../../../messages/vi/settings/core.json';
import enSettingsCore from '../../../messages/en/settings/core.json';
import viSettingsFinance from '../../../messages/vi/settings/finance.json';
import enSettingsFinance from '../../../messages/en/settings/finance.json';

const viSettings = { ...viSettingsCore, ...viSettingsFinance };
const enSettings = { ...enSettingsCore, ...enSettingsFinance };

/** The provider updates in place: changing locale must not remount/reset form state. */
export function domainContext() {
  const current = { locale: 'vi' };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    const messages =
      current.locale === 'vi'
        ? { ui: viUi, affiliate: viAffiliate, bots: viBots, settings: viSettings }
        : { ui: enUi, affiliate: enAffiliate, bots: enBots, settings: enSettings };
    return (
      <NextIntlClientProvider
        locale={current.locale}
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return { current, client, wrapper: Wrapper };
}
