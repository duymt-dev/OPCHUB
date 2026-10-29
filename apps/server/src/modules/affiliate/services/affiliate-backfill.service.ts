import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaidMembersRepository } from '../../membership-fee';
import { AffiliateAllocationService } from './affiliate-allocation.service';

const BATCH_SIZE = 500;

/** D-94 3A: mọi TV (kể cả trial) là đại lý, mã luôn hoạt động (D-110); keyset từng lô, không N+1. */
@Injectable()
export class AffiliateBackfillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paid: PaidMembersRepository,
    private readonly allocation: AffiliateAllocationService,
  ) {}

  async ensureForPaidMembers(): Promise<number> {
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
            page.map((r) => ({ userId: r.userId, fullName: r.user.fullName, status: 'active' })),
          ),
        { timeout: 30_000 },
      );
      after = page.at(-1)?.userId;
    }
  }
}
