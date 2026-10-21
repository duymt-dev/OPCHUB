import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@opchub/ui/globals.css';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppProviders } from '@/providers/app-providers';

export const metadata: Metadata = {
  title: 'OPC Hub',
  icons: { icon: '/opchub-logo.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLocale();
  return (
    <html lang={lang}>
      <body>
        <AntdRegistry>
          <NextIntlClientProvider>
            <AppProviders>{children}</AppProviders>
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
