import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default('/v1'),
  /** 'msw' khi chưa có backend; tắt để gọi API thật */
  NEXT_PUBLIC_API_MOCKING: z.enum(['msw', 'off']).default('msw'),
  /** D-35: hộp TK dùng thử trên login; trống = chỉ bật khi đang dùng MSW (dev/demo) */
  NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS: z.enum(['on', 'off']).optional(),
  /** Gốc User Portal để tạo link chia sẻ (sự kiện…) */
  NEXT_PUBLIC_PORTAL_URL: z.string().url().default('https://opchub.community'),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS: process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS,
  NEXT_PUBLIC_PORTAL_URL: process.env.NEXT_PUBLIC_PORTAL_URL,
});

/** V2Q-163: prototype ver2 bỏ hộp "Tài khoản dùng thử" → mặc định tắt mọi chế độ, bật bằng `on` */
export const showDemoAccounts = env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'on';
