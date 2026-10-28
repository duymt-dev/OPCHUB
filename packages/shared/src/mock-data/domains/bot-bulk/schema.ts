import { z } from 'zod';
import { botBulkBatchSchema, botBulkItemSchema } from '../../../api-domains/bot-bulk';

export const mockBulkRecordSchema = z
  .strictObject({
    value: botBulkBatchSchema,
    actorId: z.string().min(1),
    requestId: z.uuid(),
    items: z.array(botBulkItemSchema).max(500),
    attempts: z.number().int().min(0).max(3),
    nextAt: z.number().finite().nullable(),
  })
  .refine(
    (record) =>
      record.value.cursor === record.items.length &&
      record.value.cursor <= record.value.total &&
      (record.value.status === 'running'
        ? record.value.cursor < record.value.total &&
          record.nextAt !== null &&
          record.value.error === null
        : record.nextAt === null &&
          (record.value.status === 'done'
            ? record.value.cursor === record.value.total && record.value.error === null
            : record.value.cursor < record.value.total && record.value.error !== null)) &&
      record.value.total === record.value.topics.length * record.value.perTopic &&
      record.items.every(
        (item, index) =>
          item.ordinal === index &&
          item.lines.length === record.value.turns &&
          item.topic === record.value.topics[Math.floor(index / record.value.perTopic)] &&
          (!item.savedScriptId || item.selected),
      ) &&
      new Set(record.items.map((item) => item.id)).size === record.items.length &&
      record.value.selectedCount === record.items.filter((item) => item.selected).length &&
      record.value.savedCount === record.items.filter((item) => item.savedScriptId !== null).length,
    { message: 'Inconsistent bulk progress/items' },
  );
export const mockBulkWorkflowSchema = z
  .array(mockBulkRecordSchema)
  .refine(
    (records) =>
      new Set(records.map((record) => record.value.id)).size === records.length &&
      new Set(records.map((record) => `${record.actorId}:${record.requestId}`)).size ===
        records.length,
    { message: 'Duplicate bulk identity' },
  );
export type MockBulkRecord = z.infer<typeof mockBulkRecordSchema>;
