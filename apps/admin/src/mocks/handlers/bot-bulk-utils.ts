import { botBulkParamsSchema } from '@opchub/shared/api-domains';
import { validationError } from './domain-util';

export function bulkParams(params: Record<string, string | readonly string[] | undefined>) {
  const parsed = botBulkParamsSchema.safeParse({ batchId: params.batchId });
  return parsed.success
    ? { ok: true as const, id: parsed.data.batchId }
    : { ok: false as const, res: validationError(parsed.error) };
}
