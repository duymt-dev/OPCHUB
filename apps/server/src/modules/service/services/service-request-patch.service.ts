import { Injectable } from '@nestjs/common';
import type { ServiceRequest, updateServiceRequestSchema } from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { REQUEST_SELECT, toRequest } from '../service.mapper';
import { type Actor, ServiceAdminService } from './service-admin.service';

/**
 * `PATCH /admin/service-requests/:code` (SRS §13): gộp đổi trạng thái + người phụ trách.
 * Trạng thái vẫn đi qua `transition(from = trạng thái hiện tại)` → UPDATE có điều kiện (luật 7);
 * hai bước là hai transaction, mỗi bước ghi audit riêng.
 */
@Injectable()
export class ServiceRequestPatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly admin: ServiceAdminService,
  ) {}

  async patch(
    actor: Actor,
    code: string,
    b: z.output<typeof updateServiceRequestSchema>,
  ): Promise<ServiceRequest> {
    const cur = await this.prisma.db.serviceRequest.findUnique({
      where: { code },
      select: { status: true },
    });
    if (!cur) throw notFound('Không tìm thấy phiếu yêu cầu');
    let out: ServiceRequest | null = null;
    if (b.status !== undefined && b.status !== cur.status) {
      out = await this.admin.transition(actor, code, cur.status, b.status);
    }
    if (b.assignee !== undefined) out = await this.admin.assign(actor, code, b.assignee);
    if (out) return out;
    return toRequest(
      await this.prisma.db.serviceRequest.findUniqueOrThrow({
        where: { code },
        select: REQUEST_SELECT,
      }),
    );
  }
}
