import { botBulkCreateSchema, type BotBulkCreate } from '@opchub/shared/api-domains';

export type BotBulkInput = Omit<BotBulkCreate, 'requestId'>;

/** One user intent survives an uncertain transport failure, not a confirmed success. */
export function bulkRequestReplay(uuid: () => string = () => crypto.randomUUID()) {
  let pending: { fingerprint: string; input: BotBulkCreate } | null = null;
  return {
    prepare(input: BotBulkInput): BotBulkCreate {
      const parsed = botBulkCreateSchema.parse({
        ...input,
        requestId: pending?.input.requestId ?? uuid(),
      });
      const fingerprint = JSON.stringify({ ...parsed, requestId: undefined });
      if (pending?.fingerprint === fingerprint) return pending.input;
      if (pending) parsed.requestId = uuid();
      pending = { fingerprint, input: parsed };
      return parsed;
    },
    acknowledge(requestId: string) {
      if (pending?.input.requestId === requestId) pending = null;
    },
  };
}
