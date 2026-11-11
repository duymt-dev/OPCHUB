'use client';

import { ToastProvider } from '@opchub/ui';
import type { ConfigProviderProps } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query-client';
import { MockProvider } from './mock-provider';
import { AdminUiLocaleProvider } from './admin-ui-locale-provider';

export function AppProviders({
  children,
  uiLocale,
}: {
  children: ReactNode;
  uiLocale?: NonNullable<ConfigProviderProps['locale']>;
}) {
  const [client] = useState(makeQueryClient);
  return (
    <MockProvider>
      <QueryClientProvider client={client}>
        <AdminUiLocaleProvider locale={uiLocale}>
          <ToastProvider>{children}</ToastProvider>
        </AdminUiLocaleProvider>
      </QueryClientProvider>
    </MockProvider>
  );
}
