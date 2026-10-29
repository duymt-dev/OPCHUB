import { z } from 'zod';
import { llmTurnTextSchema } from '../integrations/llm';

/** Transport/workload bound, not a silent truncation. Larger input can be split into batches. */
export const BOT_BULK_MAX_TOPICS = 100;
export function botBulkTopics(input: string | readonly string[]): string[] {
  const lines = typeof input === 'string' ? input.split(/\r?\n/) : input;
  const seen = new Set<string>();
  return lines.flatMap((line) => {
    const topic = line.trim();
    const key = topic.toLowerCase();
    if (!topic || seen.has(key)) return [];
    seen.add(key);
    return [topic];
  });
}

export const botBulkCreateSchema = z.strictObject({
  requestId: z.uuid(),
  topics: z
    .array(z.string().trim().max(200))
    .transform(botBulkTopics)
    .pipe(z.array(z.string().min(1)).min(1).max(BOT_BULK_MAX_TOPICS)),
  typeId: z.string().min(1).max(100).default('builtin-qa'),
  perTopic: z.number().int().min(1).max(5).default(2),
  turns: z.number().int().min(2).max(8).default(4),
  delayMinutes: z.number().int().min(1).max(60).default(5),
  groupIds: z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .max(100)
    .transform((ids) => [...new Set(ids)]),
});
export type BotBulkCreate = z.output<typeof botBulkCreateSchema>;
export const botBulkParamsSchema = z.strictObject({ batchId: z.uuid() });
export const botBulkActionSchema = z.strictObject({});
export const botBulkItemsQuerySchema = z.strictObject({
  after: z.coerce.number().int().min(-1).max(499).default(-1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type BotBulkItemsQuery = z.output<typeof botBulkItemsQuerySchema>;
export const botBulkSelectionSchema = z.strictObject({
  itemIds: z
    .array(z.uuid())
    .min(1)
    .max(500)
    .transform((ids) => [...new Set(ids)]),
  selected: z.boolean(),
});
export type BotBulkSelection = z.output<typeof botBulkSelectionSchema>;

export const botBulkStatusSchema = z.enum(['running', 'failed', 'done']);
export const botBulkErrorSchema = z.enum([
  'provider',
  'invalid_response',
  'duplicate',
  'personas_missing',
  'groups_missing',
]);
export type BotBulkError = z.output<typeof botBulkErrorSchema>;
export const BOT_BULK_ERROR_MESSAGES: Record<BotBulkError, string> = {
  provider: 'Không gọi được AI. Kiểm tra cấu hình hoặc kết nối rồi thử lại.',
  invalid_response: 'AI trả về hội thoại không hợp lệ. Thử lại hoặc kiểm tra giới hạn token.',
  duplicate: 'AI trả về câu trùng với nội dung đã có. Thử tạo lại với cách diễn đạt mới.',
  personas_missing: 'Cần ít nhất 2 persona đang bật để tạo hội thoại.',
  groups_missing: 'Nhóm đích không còn khả dụng. Kiểm tra nhóm trước khi tạo lại.',
};

export const botBulkLineSchema = z.strictObject({
  personaId: z.string().min(1),
  body: llmTurnTextSchema,
});
/** Never accept provider-chosen persona IDs or extra instructions as structured output. */
export const botBulkCompletionSchema = z.strictObject({
  lines: z.array(llmTurnTextSchema).min(2).max(8),
});
export const botBulkItemSchema = z.strictObject({
  id: z.uuid(),
  ordinal: z.number().int().min(0).max(499),
  topic: z.string().min(1).max(200),
  lines: z.array(botBulkLineSchema).min(2).max(8),
  selected: z.boolean(),
  savedScriptId: z.string().nullable(),
});
export type BotBulkItem = z.output<typeof botBulkItemSchema>;
export const botBulkBatchSchema = z.strictObject({
  id: z.uuid(),
  topics: z.array(z.string().min(1).max(200)).min(1).max(BOT_BULK_MAX_TOPICS),
  typeName: z.string().min(1).max(60),
  typeDescription: z.string().max(2000),
  perTopic: z.number().int().min(1).max(5),
  turns: z.number().int().min(2).max(8),
  delayMinutes: z.number().int().min(1).max(60),
  groupIds: z.array(z.string()).min(1).max(100),
  status: botBulkStatusSchema,
  total: z.number().int().min(1).max(500),
  cursor: z.number().int().min(0).max(500),
  error: botBulkErrorSchema.nullable(),
  selectedCount: z.number().int().min(0).max(500),
  savedCount: z.number().int().min(0).max(500),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type BotBulkBatch = z.output<typeof botBulkBatchSchema>;
export const botBulkLatestSchema = z.strictObject({ batch: botBulkBatchSchema.nullable() });
export const botBulkItemsPageSchema = z.strictObject({
  items: z.array(botBulkItemSchema).max(50),
  nextCursor: z.number().int().min(0).max(499).nullable(),
});
export const botBulkSavedSchema = z.strictObject({
  scriptIds: z.array(z.string()).max(500),
  saved: z.number().int().min(0).max(500),
});
