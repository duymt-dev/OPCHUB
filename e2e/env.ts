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
});

export const env = schema.parse({
  PARITY_IDS: process.env.PARITY_IDS,
  PARITY_MODE: process.env.PARITY_MODE,
  PARITY_WORKERS: process.env.PARITY_WORKERS,
  PORTAL_PORT: process.env.PORTAL_PORT,
  ADMIN_PORT: process.env.ADMIN_PORT,
  PROTO_PORT: process.env.PROTO_PORT,
});
