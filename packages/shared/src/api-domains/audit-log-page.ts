import { z } from 'zod';
import { auditLogRowSchema } from './settings-admin';

export const auditLogCursorSchema = z
  .object({ at: z.iso.datetime(), id: z.string().min(1).max(200) })
  .strict();
export type AuditLogCursor = z.infer<typeof auditLogCursorSchema>;
export function encodeAuditLogCursor(cursor: AuditLogCursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export const auditLogPageQuerySchema = z
  .object({
    cursor: z
      .string()
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((raw, ctx) => {
        try {
          const bytes = Uint8Array.from(atob(raw.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
            c.charCodeAt(0),
          );
          return auditLogCursorSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Cursor không hợp lệ' });
          return z.NEVER;
        }
      })
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type AuditLogPageQuery = z.infer<typeof auditLogPageQuerySchema>;
export const auditLogPageSchema = z.object({
  items: z.array(auditLogRowSchema),
  nextCursor: z.string().nullable(),
});
export type AuditLogPage = z.infer<typeof auditLogPageSchema>;

export function auditCsvTimestamp(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** CSV shares the labels rendered by Admin Settings; no relative time in exported files. */
export const AUDIT_TAG_LABELS = {
  affiliate: 'Affiliate',
  sso: 'SSO',
  member: 'Thành viên',
  permission: 'Phân quyền',
  project: 'Dự án',
  language: 'Ngôn ngữ',
  moderation: 'Kiểm duyệt',
  settings: 'Cấu hình',
  content: 'Nội dung',
  report: 'Báo cáo',
  pricing: 'Bảng giá',
} as const;
