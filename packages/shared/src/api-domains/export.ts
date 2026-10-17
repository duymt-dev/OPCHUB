import { z } from 'zod';

/**
 * Job xuất dữ liệu (luật 10, Q-G4a-6, B43). `POST …/export` trả 202 `exportJobSchema` (groups.ts);
 * FE hỏi `GET /admin/exports/:id` tới khi `done` → `url` tải (presign 5 phút).
 */
export const EXPORT_KINDS = ['users', 'group_members'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const EXPORT_JOB_STATUS = ['queued', 'running', 'done', 'failed'] as const;
export const exportStatusSchema = z.object({
  id: z.string(),
  kind: z.enum(EXPORT_KINDS),
  status: z.enum(EXPORT_JOB_STATUS),
  rowCount: z.number().int().nullable(),
  url: z.string().nullable(),
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
  z.object({ kind: z.literal('users'), userIds: z.array(z.string()).optional() }),
  z.object({
    kind: z.literal('group_members'),
    groupIds: z.array(z.string()).min(1),
    status: z.enum(['all', 'active', 'locked']),
    fields: z.array(z.enum(GROUP_EXPORT_FIELDS)).min(1),
  }),
]);
export type ExportParams = z.infer<typeof exportParamsSchema>;
