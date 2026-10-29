import { Injectable } from '@nestjs/common';
import type { AffiliateStatus, DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface AffiliateRow {
  id: string;
  userId: string;
  code: string;
  rate: number;
  status: AffiliateStatus;
}

const SELECT = { id: true, userId: true, code: true, rate: true, status: true } as const;

/** Bảng `affiliates` + `affiliate_policy` (§20.7) */
@Injectable()
export class AffiliateRepository {
  constructor(private readonly prisma: PrismaService) {}

  byUser(tx: DbTx, userId: string): Promise<AffiliateRow | null> {
    return tx.affiliate.findUnique({ where: { userId }, select: SELECT });
  }

  byCode(code: string): Promise<(AffiliateRow & { email: string; name: string }) | null> {
    return this.prisma.db.affiliate
      .findUnique({
        where: { code },
        select: { ...SELECT, user: { select: { email: true, fullName: true } } },
      })
      .then((r) => (r ? { ...r, email: r.user.email, name: r.user.fullName } : null));
  }

  async defaultRate(tx: DbTx): Promise<number> {
    const p = await tx.affiliatePolicy.findUnique({
      where: { id: 1 },
      select: { defaultRate: true },
    });
    return p?.defaultRate ?? 20;
  }

  codeTaken(tx: DbTx, code: string): Promise<boolean> {
    return tx.affiliate.count({ where: { code } }).then((n) => n > 0);
  }

  /** AF-R01: `ON CONFLICT (user_id) DO NOTHING` — chạy lại không tạo bản thứ hai */
  async insertIfAbsent(
    tx: DbTx,
    row: { userId: string; code: string; rate: number; status: AffiliateStatus },
  ): Promise<boolean> {
    const n = await tx.$executeRaw`
      INSERT INTO affiliates (id, user_id, code, rate, status, updated_at)
      VALUES (gen_random_uuid()::text, ${row.userId}, ${row.code}, ${row.rate},
              ${row.status}::affiliate_status, now())
      ON CONFLICT (user_id) DO NOTHING`;
    return n > 0;
  }
}
