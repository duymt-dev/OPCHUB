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
  /** HS256 — tối thiểu 32 ký tự ngẫu nhiên */
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('opchub'),
  /** Cookie refresh `Secure` (tắt ở dev http) */
  REFRESH_COOKIE_SECURE: bool.default(true),
  /** URL Portal cho link trong mail (đặt lại mật khẩu, đăng nhập) */
  PORTAL_URL: z.string().url().default('http://localhost:3000'),
  /** Adapter (adapters.md): dev/test mặc định fake */
  MAIL_PROVIDER: z.enum(['fake', 'smtp']).default('fake'),
  /** D-05: Bot + Dịch vụ sau feature flag (GĐ3). Tắt → module không đăng ký → 404 */
  FEATURE_BOTS: bool.default(false),
  FEATURE_SERVICES: bool.default(false),
  MAIL_FROM_NAME: z.string().default('OPC Hub'),
  MAIL_FROM_EMAIL: z.string().email().default('no-reply@opchub.community'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  BANK_PROVIDER: z.enum(['fake', 'sepay']).default('fake'),
  /** HMAC webhook ngân hàng (fake cũng ký để đi đúng đường thật) */
  BANK_WEBHOOK_SECRET: z.string().min(16),
  SEPAY_API_TOKEN: z.string().optional(),
  BANK_ACCOUNT_NO: z.string().default('1203132809'),
  BANK_NAME: z.string().default('Vietcombank'),
  BANK_ACCOUNT_NAME: z.string().default('Công ty cổ phần Tập đoàn Media Soft'),
  BANK_FULL_NAME: z.string().default('Vietcombank – Ngân hàng TMCP Ngoại thương Việt Nam'),
  TAX_LOOKUP_PROVIDER: z.enum(['fake', 'chain']).default('fake'),
  SSO_PROVIDER: z.enum(['fake']).default('fake'),
  S3_ENDPOINT: z.string().url().default('http://127.0.0.1:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('opchub-dev'),
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  /** Gốc URL công khai của ảnh (Nginx/CDN); dev = endpoint/bucket */
  S3_PUBLIC_URL: z.string().url().optional(),
  /** AES-256-GCM cho secret lưu DB (TOTP, SMTP key) — 32 byte base64 */
  DATA_ENC_KEY: z.string().min(40),
  /** Chỉ dev/test (e2e không đọc được hộp thư): OTP cố định 6 số — cấm ở production (Q-B11-2) */
  OTP_FIXED_CODE: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

export type Env = Readonly<z.infer<typeof envSchema>>;

/** Parse env; lỗi chỉ nêu tên biến, không in giá trị (có thể là secret) */
export function parseEnv(source: Record<string, string | undefined>): Env {
  // Biến để trống (`KEY=` như .env.example) coi như chưa đặt → dùng default / optional
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const r = envSchema.safeParse(cleaned);
  if (!r.success) {
    const names = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Env không hợp lệ — ${names}`);
  }
  if (r.data.NODE_ENV === 'production' && r.data.OTP_FIXED_CODE) {
    throw new Error('Env không hợp lệ — OTP_FIXED_CODE: cấm dùng ở production');
  }
  return Object.freeze(r.data);
}
