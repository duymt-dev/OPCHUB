import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ['@opchub/ui', '@opchub/shared'],
  experimental: { optimizePackageImports: ['antd', '@ant-design/icons'] },
};

export default withNextIntl(config);
