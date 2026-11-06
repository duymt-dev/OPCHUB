import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { z } from 'zod';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** Có API_PROXY_URL (dev/e2e với server thật) → Next chuyển tiếp `/v1/*` cùng origin (cookie refresh path `/v1/auth`). Production: Nginx làm việc này. */
const buildEnv = z
  .object({
    API_PROXY_URL: z.string().url().optional(),
    API_INTERNAL_URL: z.url().optional(),
    NEXT_PUBLIC_API_MOCKING: z.enum(['msw', 'off']).default('msw'),
    /** Bản build riêng cho e2e server thật (vd `.next-server`) để không ghi đè bản MSW của parity */
    NEXT_DIST_DIR: z.string().optional(),
  })
  .refine((v) => v.NEXT_PUBLIC_API_MOCKING === 'msw' || !!v.API_INTERNAL_URL, {
    path: ['API_INTERNAL_URL'],
    message: 'Required when mocking is off',
  })
  .parse({
    API_PROXY_URL: process.env.API_PROXY_URL || undefined,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL || undefined,
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || undefined,
  });

const config: NextConfig = {
  reactStrictMode: true,
  ...(buildEnv.NEXT_DIST_DIR ? { distDir: buildEnv.NEXT_DIST_DIR } : {}),
  devIndicators: false,
  transpilePackages: ['@opchub/ui', '@opchub/shared'],
  experimental: { optimizePackageImports: ['antd', '@ant-design/icons'] },
  async rewrites() {
    const target = buildEnv.NEXT_PUBLIC_API_MOCKING === 'msw' ? undefined : buildEnv.API_PROXY_URL;
    return target ? [{ source: '/v1/:path*', destination: `${target}/v1/:path*` }] : [];
  },
};

export default withNextIntl(config);
