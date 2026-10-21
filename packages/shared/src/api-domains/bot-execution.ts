import { z } from 'zod';

export const BOT_EXECUTION_STATUS = ['scheduled', 'running', 'done'] as const;
export const botExecutionStatusSchema = z.enum(BOT_EXECUTION_STATUS);
export const botStoredLinesSchema = z.array(z.object({ personaId: z.string(), body: z.string() }));
export const botThreadStoppedSchema = z.object({ id: z.string(), status: z.literal('done') });
/** Internal write context only; never part of a Portal message DTO. */
export const botMessageContextSchema = z.object({
  threadId: z.string().min(1).max(200),
  kind: z.enum(['script', 'auto', 'reply']),
  turn: z.number().int().nonnegative(),
});
