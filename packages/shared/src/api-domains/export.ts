import { z } from 'zod';
import { reportParamsSchema } from './reports';

/**
 * Job xuất dữ liệu (luật 10, Q-G4a-6, B43). `POST …/export` trả 202 `exportJobSchema` (groups.ts);
 * FE hỏi `GET /admin/exports/:id` tới khi `done` → `url` tải (presign 1 giờ, NA-14);
 * mỗi lần trả `url` server ghi audit `export.download`.
 */
export const EXPORT_KINDS = ['users', 'group_members', 'report', 'audit'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const EXPORT_JOB_STATUS = ['queued', 'running', 'done', 'failed'] as const;
export const exportStatusSchema = z.object({
  id: z.string(),
  kind: z.enum(EXPORT_KINDS),
  status: z.enum(EXPORT_JOB_STATUS),
  rowCount: z.number().int().nullable(),
  url: z.string().nullable(),
  /** Thời hạn link `url` (giây) — 3600 khi có link, null khi chưa xong */
  expiresInSec: z.number().int().nullable(),
});
export type ExportStatus = z.infer<typeof exportStatusSchema>;

export const GROUP_EXPORT_FIELDS = [
  'group',
  'name',
  'email',
  'phone',
  'type',
  'company',
  'tax',
  'grole',
  'country',
  'date',
  'status',
] as const;

/** Tham số job lưu trong `export_jobs.params` — worker parse lại */
export const exportParamsSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('audit') }).strict(),
  z.object({ kind: z.literal('users'), userIds: z.array(z.string()).optional() }),
  z.object({
    kind: z.literal('group_members'),
    groupIds: z.array(z.string()).min(1),
    status: z.enum(['all', 'active', 'locked']),
    fields: z.array(z.enum(GROUP_EXPORT_FIELDS)).min(1),
  }),
  // V4-614 (D-78): Báo cáo B1/B2/B3 theo tháng — `file` = tên file tải (không dấu)
  z.object({ kind: z.literal('report'), report: reportParamsSchema, file: z.string() }),
]);
export type ExportParams = z.infer<typeof exportParamsSchema>;
