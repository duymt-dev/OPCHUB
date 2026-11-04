import { Injectable } from '@nestjs/common';
import { regionalSummaryRows } from '../domain/regional-share-summary';
import { payoutMonthOf, regionalPayoutDate, regionalPercent } from '@opchub/shared';
import { regionalShareCursorSchema, type RegionalRegion } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AffiliateShareReader } from '@/modules/affiliate';
import { RegionalShareProjectionRepository } from '@/modules/reporting';
import { RegionalDirectorRepository } from '../repositories/regional-director.repository';
import { RegionalShareSummaryRepository } from '../repositories/regional-share-summary.repository';
import { RegionalValidationError } from '../domain/regional-director.rules';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd')
    .replaceAll('Đ', 'D')
    .toLowerCase();
@Injectable()
export class RegionalShareReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: RegionalDirectorRepository,
    private readonly summary: RegionalShareSummaryRepository,
    private readonly people: RegionalShareProjectionRepository,
    private readonly affiliate: AffiliateShareReader,
  ) {}

  async list(q: string, now = new Date()) {
    const slots = await this.slots.slots();
    return this.prisma.db.$transaction(async (tx) => {
      const aggregates = await this.summary.aggregate(tx, payoutMonthOf(now));
      const ids = [
        ...new Set([
          ...aggregates.map((a) => a.userId),
          ...slots.flatMap((s) => (s.userId ? [s.userId] : [])),
        ]),
      ];
      const members = await this.people.members(tx, ids);
      const banks = await this.summary.payeeBanks(tx, ids);
      const policy = await this.affiliate.policyAt(tx);
      const rows = regionalSummaryRows(slots, aggregates, members, banks);
      return {
        kpi: {
          total: rows.reduce((s, r) => s + r.total, 0),
          count: rows.reduce((s, r) => s + r.count, 0),
          affiliates: new Set(aggregates.flatMap((a) => a.affiliates)).size,
          due: rows.reduce((s, r) => s + r.due, 0),
          paid: rows.reduce((s, r) => s + r.paid, 0),
          payoutDate: regionalPayoutDate(now),
        },
        rule: {
          years: [1, 2, 3].map((year) => ({ year, percent: regionalPercent(year, policy) })),
          min: policy.regionalMin,
        },
        rows: rows.filter(
          (row) => !q || fold(`${row.label} ${row.member?.fullName ?? ''}`).includes(fold(q)),
        ),
      };
    });
  }

  page(region: RegionalRegion, limit: number, opaque?: string) {
    let cursor: { recordedAt: string; id: string } | undefined;
    if (opaque) {
      try {
        cursor = regionalShareCursorSchema.parse(
          JSON.parse(Buffer.from(opaque, 'base64url').toString('utf8')),
        );
      } catch {
        throw new RegionalValidationError('Con trỏ không hợp lệ', 'cursor');
      }
    }
    return this.prisma.db.$transaction(async (tx) => {
      const rows = await this.people.page(tx, region, cursor, limit);
      const last = rows.at(-1);
      const next = last ? { recordedAt: last.recordedAt.toISOString(), id: last.id } : cursor;
      const [remaining] = await this.people.remaining(tx, region, next);
      const more = Number(remaining?.count ?? 0);
      return {
        items: rows.map((row) => ({ ...row, recordedAt: row.recordedAt.toISOString() })),
        more,
        nextCursor: more && next ? Buffer.from(JSON.stringify(next)).toString('base64url') : null,
      };
    });
  }
  async history(region: RegionalRegion) {
    const items = await this.people.history(this.prisma.db, region);
    return {
      items: items.map((row) => ({
        ...row,
        amount: Number(row.amount),
        paidAt: row.paidAt.toISOString(),
      })),
    };
  }
}
