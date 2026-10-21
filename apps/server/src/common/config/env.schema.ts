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
  /** Chỉ dev/e2e/k6 một máy (mọi request cùng IP): tắt rate limit — cấm ở production (Q-B62-1) */
  RATE_LIMIT_DISABLED: bool.default(false),
  /** TD-018: số handshake socket tối đa / phút / IP và / tài khoản (tắt cùng RATE_LIMIT_DISABLED) */
  SOCKET_CONNECT_PER_MIN: z.coerce.number().int().min(1).default(30),
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
  /** URL Admin cho link trong mail của TK quản trị (BUG-001, D-62) */
  ADMIN_URL: z.string().url().default('http://localhost:3001'),
  /** Adapter (adapters.md): dev/test mặc định fake */
  MAIL_PROVIDER: z.enum(['fake', 'smtp', 'brevo']).default('fake'),
  /** Chỉ dev/e2e (TD-035): FakeMail ghi thư ra thư mục này — cấm ở production */
  FAKE_MAIL_DIR: z.string().optional(),
  /** D-05: Bot + Dịch vụ sau feature flag. Tắt → module không đăng ký → 404 */
  FEATURE_BOTS: bool.default(false),
  /** D-51 / D-60: Dịch vụ thuộc go-live (popup V4) — cờ chỉ còn là công tắc khẩn cấp */
  FEATURE_SERVICES: bool.default(true),
  MAIL_FROM_NAME: z.string().default('OPC Hub'),
  MAIL_FROM_EMAIL: z.string().email().default('no-reply@opchub.community'),
  /** NA-05: số thư/ngày dành riêng cho OTP + đặt lại mật khẩu trong hạn mức SMTP */
  MAIL_OTP_RESERVE: z.coerce.number().int().min(0).default(20),
  /** BUG-036: HMAC link huỷ nhận thư chiến dịch (≥ 32 ký tự) — bắt buộc ở production */
  UNSUBSCRIBE_SECRET: z.string().min(32).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** Cấu hình Brevo REST API */
  BREVO_API_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  BANK_PROVIDER: z.enum(['fake', 'sepay']).default('fake'),
  /** HMAC webhook ngân hàng (fake cũng ký để đi đúng đường thật) */
  BANK_WEBHOOK_SECRET: z.string().min(16),
  SEPAY_API_TOKEN: z.string().optional(),
  BANK_ACCOUNT_NO: z.string().default('1203132809'),
  BANK_NAME: z.string().default('Vietcombank'),
  BANK_ACCOUNT_NAME: z.string().default('Công ty cổ phần Tập đoàn Media Soft'),
  BANK_FULL_NAME: z.string().default('Vietcombank – Ngân hàng TMCP Ngoại thương Việt Nam'),
  TAX_LOOKUP_PROVIDER: z.enum(['fake', 'chain']).default('fake'),
  /** D-64: fake chỉ dev/test (cấm ở production); google = OIDC thật */
  SSO_PROVIDER: z.enum(['fake', 'google']).default('fake'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** s3 = RustFS/S3 (mặc định, production); local = đĩa + `/v1/uploads/*` (chỉ dev/e2e, Q-B61-2) */
  STORAGE_PROVIDER: z.enum(['s3', 'local']).default('s3'),
  /** Thư mục object khi STORAGE_PROVIDER=local (ngoài repo) */
  LOCAL_STORAGE_DIR: z.string().optional(),
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
  if (
    cleaned['EMAIL_PROVIDER'] === 'brevo' ||
    cleaned['EMAIL_API_KEY'] ||
    cleaned['BREVO_API_KEY']
  ) {
    cleaned['MAIL_PROVIDER'] = cleaned['MAIL_PROVIDER'] ?? 'brevo';
  }
  if (cleaned['EMAIL_FROM'] && !cleaned['MAIL_FROM_EMAIL']) {
    cleaned['MAIL_FROM_EMAIL'] = cleaned['EMAIL_FROM'];
  }
  if (cleaned['EMAIL_FROM_NAME'] && !cleaned['MAIL_FROM_NAME']) {
    cleaned['MAIL_FROM_NAME'] = cleaned['EMAIL_FROM_NAME'];
  }
  const r = envSchema.safeParse(cleaned);
  if (!r.success) {
    const names = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Env không hợp lệ — ${names}`);
  }
  if (r.data.NODE_ENV === 'production' && r.data.OTP_FIXED_CODE) {
    throw new Error('Env không hợp lệ — OTP_FIXED_CODE: cấm dùng ở production');
  }
  if (r.data.NODE_ENV === 'production' && r.data.RATE_LIMIT_DISABLED) {
    throw new Error('Env không hợp lệ — RATE_LIMIT_DISABLED: cấm dùng ở production');
  }
  if (r.data.NODE_ENV === 'production' && r.data.FAKE_MAIL_DIR) {
    throw new Error('Env không hợp lệ — FAKE_MAIL_DIR: cấm dùng ở production');
  }
  if (r.data.NODE_ENV === 'production' && r.data.STORAGE_PROVIDER === 'local') {
    throw new Error('Env không hợp lệ — STORAGE_PROVIDER: local cấm dùng ở production');
  }
  if (r.data.NODE_ENV === 'production' && !r.data.UNSUBSCRIBE_SECRET) {
    throw new Error('Env không hợp lệ — UNSUBSCRIBE_SECRET: bắt buộc ở production');
  }
  if (r.data.NODE_ENV === 'production' && r.data.SSO_PROVIDER !== 'google') {
    throw new Error('Env không hợp lệ — SSO_PROVIDER: fake cấm dùng ở production');
  }
  if (
    r.data.SSO_PROVIDER === 'google' &&
    (!r.data.GOOGLE_CLIENT_ID || !r.data.GOOGLE_CLIENT_SECRET)
  ) {
    throw new Error(
      'Env không hợp lệ — GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET: bắt buộc khi SSO_PROVIDER=google',
    );
  }
  if (r.data.STORAGE_PROVIDER === 'local' && !r.data.LOCAL_STORAGE_DIR) {
    throw new Error('Env không hợp lệ — LOCAL_STORAGE_DIR: bắt buộc khi STORAGE_PROVIDER=local');
  }
  return Object.freeze(r.data);
}
