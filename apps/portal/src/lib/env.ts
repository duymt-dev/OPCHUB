import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default('/v1'),
  /** 'msw' khi chưa có backend; tắt để gọi API thật */
  NEXT_PUBLIC_API_MOCKING: z.enum(['msw', 'off']).default('msw'),
  /** D-35: hộp TK dùng thử trên login; trống = chỉ bật khi đang dùng MSW (dev/demo) */
  NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS: z.enum(['on', 'off']).optional(),
  /** Gốc Socket.IO (vd `http://localhost:4001`); trống = cùng origin (Nginx chuyển `/socket.io`) */
  NEXT_PUBLIC_SOCKET_URL: z.string().optional(),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS: process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || undefined,
});

/** V2Q-163: prototype ver2 bỏ hộp "Tài khoản dùng thử" → mặc định tắt mọi chế độ, bật bằng `on` */
export const showDemoAccounts = env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'on';
