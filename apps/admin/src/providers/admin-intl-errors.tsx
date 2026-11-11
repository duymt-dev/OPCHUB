'use client';

import { NextIntlClientProvider, useLocale, useMessages, useTimeZone } from 'next-intl';
import type { ReactNode } from 'react';
import { logger } from '@/lib/logger';
import sourceUi from '../../messages/vi/ui.json';

/** Error callbacks are client-owned, never non-serializable props crossing an RSC boundary. */
export function AdminIntlErrors({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const messages = useMessages();
  const timeZone = useTimeZone();
  const ui: unknown = messages.ui;
  const errors: unknown = ui && typeof ui === 'object' && 'errors' in ui ? ui.errors : undefined;
  const text =
    errors && typeof errors === 'object' && 'failed' in errors && typeof errors.failed === 'string'
      ? errors.failed
      : sourceUi.errors.failed;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone ?? 'Asia/Ho_Chi_Minh'}
      onError={(error) => logger.warn('i18n', new Error(`Intl error: ${locale}/${error.code}`))}
      getMessageFallback={() => text}
    >
      {children}
    </NextIntlClientProvider>
  );
}
