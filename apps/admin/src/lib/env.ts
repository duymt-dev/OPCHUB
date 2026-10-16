import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default('/v1'),
  /** 'msw' khi chưa có backend; tắt để gọi API thật */
  NEXT_PUBLIC_API_MOCKING: z.enum(['msw', 'off']).default('msw'),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
});
