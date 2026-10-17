import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type {
  AdminService,
  servicePatchSchema,
  serviceUpsertSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type Actor, ServiceAdminService } from './service-admin.service';

const SELECT = { id: true, name: true, model: true, description: true, enabled: true } as const;

/** Danh mục dịch vụ (Admin "Dịch vụ" › Danh mục). Id `sv<n>` theo thứ tự; xoá khi đã có phiếu → 409 */
@Injectable()
export class ServiceCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly admin: ServiceAdminService,
  ) {}

  /** Số phiếu theo dịch vụ: 1 GROUP BY (idx service_id) */
  async list(): Promise<AdminService[]> {
    const [rows, counts] = await Promise.all([
      this.prisma.db.service.findMany({
        select: SELECT,
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.db.serviceRequest.groupBy({ by: ['serviceId'], _count: { _all: true } }),
    ]);
    const n = new Map(counts.map((c) => [c.serviceId, c._count._all]));
    return rows.map((r) => ({ ...r, requestCount: n.get(r.id) ?? 0 }));
  }

  create(actor: Actor, d: z.output<typeof serviceUpsertSchema>): Promise<AdminService> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const top = await tx.service.aggregate({ _max: { sort: true } });
      const sort = (top._max.sort ?? 0) + 1;
      const id = `sv${Date.now().toString(36)}`;
      const r = await tx.service.create({ data: { id, sort, ...d }, select: SELECT });
      await this.admin.log(tx, actor, 'service.create', id, `thêm dịch vụ ${d.name || id}`);
      return { ...r, requestCount: 0 };
    });
  }

  update(actor: Actor, id: string, d: z.output<typeof servicePatchSchema>): Promise<AdminService> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const data = {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.model !== undefined ? { model: d.model } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
      };
      const rows = await tx.service.updateManyAndReturn({ where: { id }, data, select: SELECT });
      const r = rows[0];
      if (!r) throw notFound('Không tìm thấy dịch vụ');
      const count = await tx.serviceRequest.count({ where: { serviceId: id } });
      await this.admin.log(tx, actor, 'service.update', id, `cập nhật dịch vụ ${r.name || id}`);
      return { ...r, requestCount: count };
    });
  }

  remove(actor: Actor, id: string): Promise<{ id: string }> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.$queryRaw<{ name: string }[]>`
        DELETE FROM services s WHERE s.id = ${id}
          AND NOT EXISTS (SELECT 1 FROM service_requests r WHERE r.service_id = s.id)
        RETURNING s.name`;
      const r = rows[0];
      if (!r) {
        const exists = await tx.service.findUnique({ where: { id }, select: { id: true } });
        throw exists
          ? conflict('Dịch vụ đã có yêu cầu – hãy tắt hiển thị thay vì xóa')
          : notFound('Không tìm thấy dịch vụ');
      }
      await this.admin.log(tx, actor, 'service.delete', id, `xoá dịch vụ ${r.name || id}`);
      return { id };
    });
  }
}
