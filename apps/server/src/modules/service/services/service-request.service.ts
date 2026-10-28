import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type createServiceRequestSchema,
  normalizeServiceDetails,
  type Service,
  type ServiceRequest,
  serviceRequestSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { notFound } from '@/common/errors';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService, serviceRequestMail } from '@/modules/mail';
import { REQUEST_SELECT, toRequest } from '../service.mapper';

type CreateIn = z.output<typeof createServiceRequestSchema>;

/** Portal: danh mục dịch vụ đang bật + gửi phiếu YC (Idempotency-Key, mã `YC-<seq>`) */
@Injectable()
export class ServiceRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
    private readonly mail: MailService,
  ) {}

  catalog(): Promise<Service[]> {
    return this.prisma.db.service.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, model: true, description: true, enabled: true },
    });
  }

  create(userId: string, key: string | undefined, body: CreateIn): Promise<ServiceRequest> {
    return this.idem.run('service-request', userId, key, serviceRequestSchema, () =>
      this.prisma.db.$transaction(async (tx: DbTx) => {
        const svc = await this.pick(tx, body.serviceId);
        if (!svc) throw notFound('Không tìm thấy dịch vụ');
        // QT-11: chỉ giữ nhãn chuẩn `SERVICE_DETAIL_LABELS`, bỏ khoá tự do của client
        const details = normalizeServiceDetails(body.details);
        const seq = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('service_request_seq') AS n`;
        const r = await tx.serviceRequest.create({
          data: {
            code: `YC-${String(seq[0]?.n ?? 0)}`,
            serviceId: svc.id,
            userId,
            requesterType: body.requesterType,
            fullName: body.fullName,
            phone: body.phone,
            email: body.email,
            organization: body.organization,
            taxCode: body.taxCode,
            address: body.address,
            note: body.note,
            details,
          },
          select: REQUEST_SELECT,
        });
        // NA-22: mail xác nhận tới email trên phiếu — mail_logs + outbox cùng transaction (luật 8)
        const m = serviceRequestMail(r.code, svc.name, body.fullName);
        await this.mail.request(tx, {
          to: body.email,
          kind: 'service',
          subject: m.subject,
          html: m.html,
        });
        return toRequest(r);
      }),
    );
  }

  /**
   * FX-02: dịch vụ đã chọn nếu đang bật; rỗng / đã tắt → dịch vụ bật đầu tiên theo thứ tự hiển thị.
   * Id không tồn tại → null (404 như cũ).
   */
  private async pick(tx: DbTx, id: string) {
    const select = { id: true, name: true, enabled: true } as const;
    const chosen = id ? await tx.service.findUnique({ where: { id }, select }) : null;
    if (id && !chosen) return null;
    if (chosen?.enabled) return chosen;
    return tx.service.findFirst({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select,
    });
  }
}
