import { Injectable } from '@nestjs/common';
import {
  type CreateInterestPortal,
  createInterestPortalSchema,
  type InvestorInterest,
  investorInterestSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { conflict, forbidden, notFound } from '@/common/errors';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type InterestRow, InterestRepository } from '../repositories/interest.repository';

type InterestInput = z.output<typeof createInterestPortalSchema>;
const currencyOf = (c: string): 'VND' | 'USD' => (c === 'USD' ? 'USD' : 'VND');

export function toInterest(r: InterestRow): InvestorInterest {
  return {
    id: r.id,
    projectId: r.projectId,
    projectName: r.project.name,
    investorName: r.user.fullName,
    avatarUrl: r.user.avatarUrl,
    kind: r.kind,
    organization: r.organization,
    phone: r.phone,
    amount: Number(r.amount),
    currency: currencyOf(r.currency),
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Quan tâm đầu tư (BR-09, D-14); D-72 bỏ luồng trao đổi nhà đầu tư ↔ OPC Hub */
@Injectable()
export class InterestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InterestRepository,
    private readonly idem: IdempotencyService,
  ) {}

  /**
   * Idempotency-Key: cùng key → trả lại quan tâm cũ, không ghi lại. Thứ tự lỗi như MSW:
   * 404 không gọi vốn → 403 chủ dự án → 409 đã gửi → 409 dưới mức tối thiểu.
   */
  create(
    userId: string,
    projectId: string,
    key: string | undefined,
    body: CreateInterestPortal,
  ): Promise<InvestorInterest> {
    return this.idem.run('interest', userId, key, investorInterestSchema, async () => {
      const input = createInterestPortalSchema.parse(body);
      return this.insert(userId, projectId, input);
    });
  }

  private async insert(userId: string, projectId: string, i: InterestInput) {
    const p = await this.repo.fundingOf(userId, projectId);
    if (!p?.funding) throw notFound('Dự án không gọi vốn');
    if (p.ownerId === userId) throw forbidden('Không thể quan tâm đầu tư dự án của chính bạn');
    const min = Number(p.funding.minTicket);
    const row = await this.prisma.db.$transaction(async (tx) => {
      const r = await this.repo.create(tx, {
        projectId,
        userId,
        kind: i.kind,
        contactName: i.contactName,
        phone: i.phone,
        organization: i.kind === 'individual' ? '' : i.organization,
        amount: BigInt(i.amount),
        currency: p.funding?.currency ?? 'VND',
        message: i.message,
      });
      if (!r) throw conflict('Bạn đã gửi quan tâm cho dự án này');
      if (min > 0 && i.amount < min) throw conflict('Số tiền thấp hơn mức đầu tư tối thiểu');
      return r;
    });
    return toInterest(row);
  }

  async ofProject(userId: string, projectId: string): Promise<{ items: InvestorInterest[] }> {
    const p = await this.prisma.db.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { ownerId: true },
    });
    if (!p) throw notFound('Không tìm thấy dự án');
    if (p.ownerId !== userId) throw forbidden('Chỉ chủ dự án xem được');
    return { items: (await this.repo.ofProject(projectId)).map(toInterest) };
  }
}
