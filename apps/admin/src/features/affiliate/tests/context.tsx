import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@opchub/ui';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import affiliate from '../../../../messages/vi/affiliate.json';
import common from '../../../../messages/vi/common.json';
import ui from '../../../../messages/vi/ui.json';

export function affiliateTestContext() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale="vi"
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ affiliate, common, ui }}
      >
        <QueryClientProvider client={client}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return { client, wrapper: Wrapper };
}

export function setupAffiliateBrowser() {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
