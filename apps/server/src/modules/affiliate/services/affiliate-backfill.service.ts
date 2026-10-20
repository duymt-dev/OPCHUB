import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaidMembersRepository } from '../../membership-fee';
import { AffiliateAllocationService } from './affiliate-allocation.service';

const BATCH_SIZE = 500;

/** Go-live: chỉ các kỳ phí thật; keyset từng lô, không query trong vòng lặp từng user. */
@Injectable()
export class AffiliateBackfillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paid: PaidMembersRepository,
    private readonly allocation: AffiliateAllocationService,
  ) {}

  async ensureForPaidMembers(now = new Date()): Promise<number> {
    let after: string | undefined;
    let created = 0;
    // Mỗi lần lặp xử lý cả lô 500; không N+1.
    for (;;) {
      const page = await this.paid.page(after, BATCH_SIZE);
      if (!page.length) return created;
      created += await this.prisma.db.$transaction(
        (tx) =>
          this.allocation.ensure(
            tx,
            page.map((r) => ({
              userId: r.userId,
              fullName: r.user.fullName,
              status:
                r.validUntil &&
                r.validUntil >= now &&
                (r.status === 'active' || r.status === 'expiring')
                  ? 'active'
                  : 'paused',
            })),
          ),
        { timeout: 30_000 },
      );
      after = page.at(-1)?.userId;
    }
  }
}
