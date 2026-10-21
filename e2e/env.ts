import { z } from 'zod';

const schema = z.object({
  /** Glob chọn màn, phân tách bằng dấu phẩy: 'A-*,D-01'. Trống = tất cả */
  PARITY_IDS: z.string().default(''),
  /** proto-only: chỉ chạy chuỗi thao tác trên prototype, chụp ảnh gốc */
  PARITY_MODE: z.enum(['compare', 'proto-only']).default('compare'),
  PARITY_WORKERS: z.coerce.number().int().positive().optional(),
  /** Cổng app khi chạy song song nhiều worktree (mặc định 3000 / 3001 / 4800) */
  PORTAL_PORT: z.coerce.number().int().positive().default(3000),
  ADMIN_PORT: z.coerce.number().int().positive().default(3001),
  PROTO_PORT: z.coerce.number().int().positive().default(4800),
  /** e2e server thật (TIP-B62): API api process + gốc socket trình duyệt dùng */
  API_PROXY_URL: z.string().url().default('http://127.0.0.1:4000'),
  SOCKET_PUBLIC_URL: z.string().url().default('http://localhost:4001'),
  SERVER_PORTAL_PORT: z.coerce.number().int().positive().default(3200),
  SERVER_ADMIN_PORT: z.coerce.number().int().positive().default(3201),
  SERVER_WORKERS: z.coerce.number().int().positive().default(1),
  /** server = test chạy trên app chế độ server thật (cổng SERVER_*), đặt bởi script e2e:server */
  E2E_TARGET: z.enum(['msw', 'server']).default('msw'),
  /** TD-035: thư mục hộp thư giả (trùng `FAKE_MAIL_DIR` của worker) — e2e server đọc link trong mail */
  FAKE_MAIL_DIR: z.string().optional(),
  /** BUG-036: e2e server ký token huỷ nhận bằng CÙNG secret với `apps/server/.env` */
  UNSUBSCRIBE_SECRET: z.string().min(32).optional(),
  /** D-65 (TIP-V2-118): cổng stub DLPL API cho e2e server; API dev trỏ DLPL_BASE_URL về đây */
  DLPL_STUB_PORT: z.coerce.number().int().positive().default(4810),
  /** 1 = chạy test `@live` tra MST bằng key DLPL thật (server chạy TAX_LOOKUP_PROVIDER=chain) */
  E2E_TAX_LIVE: z.enum(['0', '1']).default('0'),
  /** 1 = không reset dữ liệu demo ở globalSetup */
  SKIP_SEED: z.enum(['0', '1']).default('0'),
  /** Bộ audit W1 (`audit/*`, ngoài gate): DB đọc/ghi qua psql — CHỈ opchub_dev */
  AUDIT_DB_URL: z
    .string()
    .regex(/\/opchub_dev(\?|$)/, 'AUDIT_DB_URL phải trỏ opchub_dev')
    .optional(),
  AUDIT_PSQL: z.string().default('psql'),
  /** OTP cố định của server dev (`OTP_FIXED_CODE`) cho kịch bản đăng ký trong audit */
  AUDIT_OTP: z.string().default(''),
  /** walk-recheck.audit: danh sách id màn parity, phân tách bằng dấu phẩy */
  WALK_IDS: z.string().default(''),
});

export const env = schema.parse({
  PARITY_IDS: process.env.PARITY_IDS,
  PARITY_MODE: process.env.PARITY_MODE,
  PARITY_WORKERS: process.env.PARITY_WORKERS,
  PORTAL_PORT: process.env.PORTAL_PORT,
  ADMIN_PORT: process.env.ADMIN_PORT,
  PROTO_PORT: process.env.PROTO_PORT,
  API_PROXY_URL: process.env.API_PROXY_URL,
  SOCKET_PUBLIC_URL: process.env.SOCKET_PUBLIC_URL,
  SERVER_PORTAL_PORT: process.env.SERVER_PORTAL_PORT,
  SERVER_ADMIN_PORT: process.env.SERVER_ADMIN_PORT,
  SERVER_WORKERS: process.env.SERVER_WORKERS,
  SKIP_SEED: process.env.SKIP_SEED,
  DLPL_STUB_PORT: process.env.DLPL_STUB_PORT,
  E2E_TAX_LIVE: process.env.E2E_TAX_LIVE,
  E2E_TARGET: process.env.E2E_TARGET,
  FAKE_MAIL_DIR: process.env.FAKE_MAIL_DIR || undefined,
  UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET || undefined,
  AUDIT_DB_URL: process.env.AUDIT_DB_URL || undefined,
  AUDIT_PSQL: process.env.AUDIT_PSQL || undefined,
  AUDIT_OTP: process.env.AUDIT_OTP,
  WALK_IDS: process.env.WALK_IDS,
});
