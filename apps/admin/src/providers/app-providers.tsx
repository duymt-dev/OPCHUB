'use client';

import { ToastProvider, UiProvider } from '@opchub/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query-client';
import { MockProvider } from './mock-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <MockProvider>
      <QueryClientProvider client={client}>
        <UiProvider>
          <ToastProvider>{children}</ToastProvider>
        </UiProvider>
      </QueryClientProvider>
    </MockProvider>
  );
}
