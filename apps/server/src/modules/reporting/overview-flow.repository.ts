import { Injectable } from '@nestjs/common';
import { PAID_FEE_STATUS } from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';

/** D-107: thẻ "Phí" chỉ đếm phí thật, không gồm trial */
const PAID = PAID_FEE_STATUS;

/**
 * D-89 v4 "Luồng hệ thống" của Admin Tổng quan: đếm trực tiếp từ các module (phí, gian hàng,
 * nhu cầu) — mỗi bảng một `groupBy status` trên index sẵn có, không query theo dòng.
 */
@Injectable()
export class OverviewFlowRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Thành viên đang có phí hiệu lực + số đóng phí (kích hoạt / gia hạn) từ đầu tháng VN */
  async paid(start: Date): Promise<{ value: number; newThisMonth: number }> {
    const db = this.prisma.db;
    const [value, newThisMonth] = await Promise.all([
      db.membershipFee.count({ where: { status: { in: [...PAID] } } }),
      db.membershipFee.count({ where: { status: { in: [...PAID] }, paidAt: { gte: start } } }),
    ]);
    return { value, newThisMonth };
  }

  async counts() {
    const db = this.prisma.db;
    const [stores, needs] = await Promise.all([
      db.store.groupBy({ by: ['status'], _count: { _all: true } }),
      db.need.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const of = <S extends string>(rows: { status: S; _count: { _all: number } }[], s: S) =>
      rows.find((r) => r.status === s)?._count._all ?? 0;
    return {
      stores: {
        published: of(stores, 'published'),
        hidden: of(stores, 'hidden'),
        draft: of(stores, 'draft'),
      },
      needs: { open: of(needs, 'open'), closed: of(needs, 'closed') },
    };
  }
}
