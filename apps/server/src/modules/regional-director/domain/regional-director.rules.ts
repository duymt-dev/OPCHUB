import { AppError } from '@/common/errors';
import { z } from 'zod';

const adapterError = z.object({
  driverAdapterError: z.object({ cause: z.object({ code: z.string() }) }),
});

/** Prisma 7 adapters retain PostgreSQL SQLSTATE under the adapter's cause. */
export function regionalSqlState(meta: unknown): string | undefined {
  const direct = z.object({ code: z.string() }).safeParse(meta);
  if (direct.success) return direct.data.code;
  const nested = adapterError.safeParse(meta);
  return nested.success ? nested.data.driverAdapterError.cause.code : undefined;
}

/** Same domain error envelope as other validation, with the TIP's semantic 422 status. */
export class RegionalValidationError extends AppError {
  override readonly status = 422;
  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, field ? [{ path: field, message }] : undefined);
  }
}
