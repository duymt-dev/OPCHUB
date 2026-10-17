import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { z } from 'zod';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** Có API_PROXY_URL (dev/e2e với server thật) → Next chuyển tiếp `/v1/*` cùng origin (cookie refresh path `/v1/auth`). Production: Nginx làm việc này. */
const buildEnv = z
  .object({ API_PROXY_URL: z.string().url().optional() })
  .parse({ API_PROXY_URL: process.env.API_PROXY_URL || undefined });

const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ['@opchub/ui', '@opchub/shared'],
  experimental: { optimizePackageImports: ['antd', '@ant-design/icons'] },
  async rewrites() {
    const target = buildEnv.API_PROXY_URL;
    return target ? [{ source: '/v1/:path*', destination: `${target}/v1/:path*` }] : [];
  },
};

export default withNextIntl(config);
