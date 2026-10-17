import { Injectable } from '@nestjs/common';
import {
  type CreateInterestPortal,
  createInterestPortalSchema,
  type InvestorInterest,
  type InvestorThread,
  investorInterestSchema,
  type InvestorThreadMessage,
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
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Quan tâm đầu tư (BR-09, D-14) + trao đổi nhà đầu tư ↔ chủ dự án */
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

  async threads(userId: string): Promise<{ items: InvestorThread[] }> {
    const rows = await this.repo.threadsOf(userId);
    const msgs = await this.repo.messagesOf(rows.map((r) => r.id));
    const names = await this.repo.names([
      ...new Set(msgs.flatMap((m) => (m.authorId ? [m.authorId] : []))),
    ]);
    return {
      items: rows.map((r) => ({
        key: r.id,
        projectId: r.projectId,
        projectName: r.project.name,
        counterpartName: r.userId === userId ? r.project.name : r.user.fullName,
        messages: msgs
          .filter((m) => m.threadKey === r.id)
          .map((m) => ({
            id: m.id,
            threadKey: m.threadKey,
            senderName: (m.authorId && names.get(m.authorId)) || 'OPC Hub',
            fromInvestor: m.fromInvestor,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
      })),
    };
  }

  /** Chủ dự án trả lời lần đầu → `sent → in_discussion` (có điều kiện) */
  async send(userId: string, key: string, body: string): Promise<InvestorThreadMessage> {
    const r = await this.repo.find(key);
    if (!r || (r.userId !== userId && r.project.ownerId !== userId)) {
      throw notFound('Không tìm thấy cuộc trao đổi');
    }
    const fromInvestor = r.userId === userId;
    const m = await this.prisma.db.$transaction(async (tx) => {
      const msg = await this.repo.addMessage(tx, key, userId, fromInvestor, body);
      if (!fromInvestor) {
        const n = await this.repo.advance(tx, { id: key }, 'sent', 'in_discussion');
        if (n) await this.repo.syncSummaryStatus(tx, r.userId);
      }
      return msg;
    });
    const names = await this.repo.names([userId]);
    return {
      id: m.id,
      threadKey: key,
      senderName: names.get(userId) ?? '',
      fromInvestor,
      body,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
