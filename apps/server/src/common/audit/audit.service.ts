import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import { AUDIT_TAGS } from '@opchub/shared/api-domains';
import { z } from 'zod';

/** Luật 10: mọi thao tác ghi Admin + mọi lần xuất dữ liệu ghi audit_logs trong cùng transaction */
export const auditEntrySchema = z.object({
  actorId: z.string().nullable(),
  /** `user.lock`, `fee.collect`, `export.users`… */
  action: z.string().regex(/^[a-z_]+(\.[a-z_]+)+$/),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  tag: z.enum(AUDIT_TAGS),
  /** Câu mô tả ngắn cho màn Nhật ký */
  summary: z.string().max(500),
  diff: z.record(z.string(), z.unknown()).optional(),
  ip: z.string().nullable().optional(),
});
export type AuditEntry = z.input<typeof auditEntrySchema>;

/** Chỉ INSERT — không có hàm sửa/xoá (DB còn trigger chặn) */
@Injectable()
export class AuditService {
  async log(tx: DbTx, entry: AuditEntry): Promise<void> {
    const e = auditEntrySchema.parse(entry);
    await tx.auditLog.create({
      data: {
        actorId: e.actorId,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        tag: e.tag,
        summary: e.summary,
        ip: e.ip ?? null,
        ...(e.diff ? { diff: e.diff as Prisma.InputJsonValue } : {}),
      },
    });
  }
}
