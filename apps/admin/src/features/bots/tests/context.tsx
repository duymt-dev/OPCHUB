import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@opchub/ui';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import bots from '../../../../messages/vi/bots.json';
import common from '../../../../messages/vi/common.json';
import ui from '../../../../messages/vi/ui.json';

export function botTestContext() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale="vi"
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ bots, common, ui }}
      >
        <QueryClientProvider client={client}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return { client, wrapper: Wrapper };
}
