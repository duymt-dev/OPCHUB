import { z } from 'zod';
import type { personaUpsertSchema, scriptUpsertSchema } from './bot';
import { personaSchema, scriptSchema } from './bot';
import { BOT_EXECUTION_STATUS } from './bot-execution';

/** D-50: scheduled/running/done execution; run queues, stop retains terminal history.
 * Every turn posts automatically without the retired approve/discard workflow.
 */

export const BOT_THREAD_STATUS = BOT_EXECUTION_STATUS;

export const botThreadLineSchema = z.object({
  personaId: z.string(),
  /** Persona đã xoá → tên/màu giữ chỗ */
  name: z.string(),
  title: z.string(),
  color: z.string(),
  avatarUrl: z.string().nullable(),
  body: z.string(),
});
export type BotThreadLine = z.infer<typeof botThreadLineSchema>;

export const botThreadSchema = z.object({
  id: z.string(),
  scriptId: z.string().nullable(),
  topic: z.string(),
  groupIds: z.array(z.string()),
  groupNames: z.array(z.string()),
  status: z.enum(BOT_THREAD_STATUS),
  /** Hội thoại AI tự sinh từ chủ đề (không theo kịch bản) */
  isAuto: z.boolean(),
  /** Worker đang đăng dần từng lượt */
  live: z.boolean(),
  cursor: z.number().int().min(0),
  total: z.number().int().min(0),
  nextAt: z.string().datetime().nullable(),
  kind: z.enum(['script', 'auto', 'reply']),
  lines: z.array(botThreadLineSchema),
  createdAt: z.string(),
});
export type BotThread = z.infer<typeof botThreadSchema>;
export const botThreadListSchema = z.object({ items: z.array(botThreadSchema) });

export const botActivitySchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
});
export type BotActivity = z.infer<typeof botActivitySchema>;
export const botActivityListSchema = z.object({
  items: z.array(botActivitySchema),
  /** Số tin tự động đã đăng hôm nay */
  todayCount: z.number().int(),
});

/** Danh sách CRUD `GET /admin/personas`, `GET /admin/scripts` → `{ items }` */
export const personaListSchema = z.object({ items: z.array(personaSchema) });
export const scriptListSchema = z.object({ items: z.array(scriptSchema) });
export const idResultSchema = z.object({ id: z.string() });

export type PersonaUpsert = z.input<typeof personaUpsertSchema>;
export type ScriptUpsert = z.input<typeof scriptUpsertSchema>;
