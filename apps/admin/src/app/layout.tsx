import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@opchub/ui/globals.css';
import '@/i18n/fonts.css';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppProviders } from '@/providers/app-providers';
import { loadAntdLocale } from '@/i18n/antd-locales';
import { AdminIntlErrors } from '@/providers/admin-intl-errors';
import { adminFontStyle } from '@/i18n/font-config';

export const metadata: Metadata = {
  title: 'OPC Hub Admin',
  icons: { icon: '/opchub-logo.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const uiLocale = await loadAntdLocale(locale);
  return (
    <html lang={locale} style={adminFontStyle(locale)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AntdRegistry>
          <NextIntlClientProvider>
            <AdminIntlErrors>
              <AppProviders uiLocale={uiLocale}>{children}</AppProviders>
            </AdminIntlErrors>
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
