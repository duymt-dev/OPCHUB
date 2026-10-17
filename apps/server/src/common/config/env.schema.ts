import { z } from 'zod';

/**
 * Env của cả 3 process (api, socket, worker) — một schema, thiếu biến bắt buộc thì dừng lúc khởi động.
 * TIP sau chỉ THÊM dòng vào đây và vào `.env.example`.
 */
const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  SOCKET_PORT: z.coerce.number().int().positive().default(4001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Origin Portal + Admin — CORS và kiểm Origin khi refresh token */
  CORS_ORIGINS: csv,
  TRUST_PROXY: bool.default(false),
  DATABASE_URL: z.string().url(),
  /** Pool pg mỗi process (PgBouncer giữ kết nối thật) */
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  /** dev 1, test 2 — db 0 có thể thuộc dự án khác */
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(1),
});

export type Env = Readonly<z.infer<typeof envSchema>>;

/** Parse env; lỗi chỉ nêu tên biến, không in giá trị (có thể là secret) */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const r = envSchema.safeParse(source);
  if (!r.success) {
    const names = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Env không hợp lệ — ${names}`);
  }
  return Object.freeze(r.data);
}
