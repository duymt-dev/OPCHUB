import type { z } from 'zod';
import type { MockResult } from '../util';

export function invalidAffiliateInput(error: z.ZodError): MockResult<never> {
  return {
    ok: false,
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Dữ liệu không hợp lệ',
    fields: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  };
}
