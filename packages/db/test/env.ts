import { z } from 'zod';

/** Integration test chỉ chạy trên DB test (TEST_DATABASE_URL), không bao giờ opchub_dev */
export const testEnv = z
  .object({
    TEST_DATABASE_URL: z
      .string()
      .url()
      .refine((u) => u.includes('_test'), 'phải là DB test'),
  })
  // eslint-disable-next-line no-restricted-syntax -- env test parse bằng zod tại chỗ
  .parse(process.env);
