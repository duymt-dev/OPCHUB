import { defineConfig } from 'prisma/config';

/**
 * Prisma 7: URL đặt ở đây; migration dùng DIRECT_URL (bỏ qua PgBouncer).
 * `prisma generate` không cần DB nên cho phép thiếu URL.
 */
export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DIRECT_URL ?? '' },
});
