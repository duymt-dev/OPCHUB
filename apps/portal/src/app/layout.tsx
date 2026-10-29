import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@opchub/ui/globals.css';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { LocaleSync } from '@/i18n/locale-sync';
import { setFormatLocale } from '@/i18n/format';
import { AppProviders } from '@/providers/app-providers';

export const metadata: Metadata = {
  title: 'OPC Hub',
  icons: { icon: '/opchub-logo.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLocale();
  // Server Component dùng chung hàm định dạng: đặt locale cho lượt render này
  setFormatLocale(lang);
  return (
    <html lang={lang} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AntdRegistry>
          <NextIntlClientProvider>
            <LocaleSync>
              <AppProviders>{children}</AppProviders>
            </LocaleSync>
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
