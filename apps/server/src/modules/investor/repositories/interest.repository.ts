import { Injectable } from '@nestjs/common';
import type { DbTx, InvestorKind, Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { visibleTo } from '../../project';

export const INTEREST_SELECT = {
  id: true,
  projectId: true,
  kind: true,
  organization: true,
  phone: true,
  amount: true,
  currency: true,
  message: true,
  userId: true,
  createdAt: true,
  project: { select: { name: true, ownerId: true } },
  user: { select: { fullName: true, avatarUrl: true } },
} as const satisfies Prisma.InvestorInterestSelect;

export type InterestRow = Prisma.InvestorInterestGetPayload<{ select: typeof INTEREST_SELECT }>;

export interface NewInterest {
  projectId: string;
  userId: string;
  kind: InvestorKind;
  contactName: string;
  phone: string;
  organization: string;
  amount: bigint;
  currency: string;
  message: string;
}

/** `investor_interests` (Portal) + bảng tổng hợp Admin */
@Injectable()
export class InterestRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Dự án gọi vốn mà người gọi THẤY (BR-08) */
  fundingOf(userId: string, projectId: string) {
    return this.prisma.db.project.findFirst({
      where: { id: projectId, ...visibleTo(userId) },
      select: { ownerId: true, funding: { select: { currency: true, minTicket: true } } },
    });
  }

  /** UQ (project_id, user_id) — BR-09; trùng → null */
  async create(tx: DbTx, i: NewInterest): Promise<InterestRow | null> {
    const r = await tx.investorInterest.createManyAndReturn({
      data: [{ ...i, investorKey: i.userId }],
      skipDuplicates: true,
      select: { id: true },
    });
    const id = r[0]?.id;
    if (!id) return null;
    await this.bumpSummary(tx, id, i);
    return tx.investorInterest.findUnique({ where: { id }, select: INTEREST_SELECT });
  }

  /**
   * Bảng tổng hợp Admin (`investor_summaries`) cập nhật cùng transaction: lần đầu tạo dòng
   * (first_interest_id = quan tâm này); sau đó cộng tiền, lấy loại/đơn vị/SĐT mới nhất.
   */
  private async bumpSummary(tx: DbTx, id: string, i: NewInterest): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO investor_summaries (investor_key, user_id, first_interest_id, kind, organization,
                                      phone, total_amount, interest_count, last_at, updated_at)
      VALUES (${i.userId}, ${i.userId}, ${id}, ${i.kind}::investor_kind, ${i.organization}, ${i.phone},
              ${i.amount}, 1, now(), now())
      ON CONFLICT (investor_key) DO UPDATE SET
        kind = EXCLUDED.kind, organization = EXCLUDED.organization, phone = EXCLUDED.phone,
        total_amount = investor_summaries.total_amount + EXCLUDED.total_amount,
        interest_count = investor_summaries.interest_count + 1,
        last_at = now(), updated_at = now()`;
  }

  ofProject(projectId: string) {
    return this.prisma.db.investorInterest.findMany({
      where: { projectId },
      select: INTEREST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });
  }

  find(id: string) {
    return this.prisma.db.investorInterest.findUnique({ where: { id }, select: INTEREST_SELECT });
  }
}
