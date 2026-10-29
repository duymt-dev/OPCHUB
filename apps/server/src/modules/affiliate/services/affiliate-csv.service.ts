import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { z } from 'zod';
import type { affiliateExportSchema } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { affiliateCsv } from '../domain/affiliate-csv';
import { AffiliateAdminRepository } from '../repositories/affiliate-admin.repository';
import { CommissionAdminRepository } from '../repositories/commission-admin.repository';
import type { AffiliateActor } from '../types';

type ExportInput = z.infer<typeof affiliateExportSchema>;
const LABELS = { recorded: 'Đã ghi nhận', paid: 'Đã chi trả', cancelled: 'Đã hủy' } as const;
const date = (d: Date) => d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const BATCH = 1000;

@Injectable()
export class AffiliateCsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionAdminRepository,
    private readonly affiliates: AffiliateAdminRepository,
    private readonly members: MemberDirectory,
    private readonly audit: AuditService,
  ) {}

  async commissionsFile(actor: AffiliateActor, input: ExportInput) {
    return this.prisma.db.$transaction(
      async (tx) => {
        if (input.ids) {
          const found = await this.commissions.countIds(tx, input.ids);
          if (found !== new Set(input.ids).size) throw notFound('Không tìm thấy khoản hoa hồng');
        }
        const memberIds = input.q ? await this.members.searchIds(input.q, tx) : [];
        const lines: (string | number)[][] = [];
        let after: { date: Date; id: string } | undefined;
        // Export theo lô, không query theo từng dòng/người nhận.
        for (;;) {
          const rows = await this.commissions.page(
            {
              page: 1,
              size: BATCH,
              status: input.status ?? 'all',
              ...(input.q ? { q: input.q } : {}),
            },
            memberIds,
            { ...(input.ids ? { ids: input.ids } : {}), ...(after ? { after } : {}) },
            tx,
          );
          if (!rows.length) break;
          const contacts = await this.members.byIds(
            [...new Set(rows.flatMap((r) => [r.affiliateUserId, r.customerId]))],
            tx,
          );
          const names = new Map(contacts.map((c) => [c.id, c.fullName]));
          lines.push(
            ...rows.map((r) => [
              date(r.date),
              names.get(r.customerId) ?? '',
              names.get(r.affiliateUserId) ?? '',
              r.code,
              r.feeAmount,
              r.rate,
              r.amount,
              LABELS[r.status],
              r.cancelReason ?? '',
            ]),
          );
          const last = rows.at(-1);
          if (!last || rows.length < BATCH) break;
          after = { date: last.date, id: last.id };
        }
        await this.log(tx, actor, 'commissions', lines.length, input);
        return {
          filename: 'hoa-hong-affiliate.csv',
          csv: affiliateCsv(
            [
              'Ngày',
              'Thành viên mới',
              'Affiliate',
              'Mã',
              'Doanh thu',
              'Tỷ lệ (%)',
              'Hoa hồng',
              'Trạng thái',
              'Lý do',
            ],
            lines,
          ),
        };
      },
      { timeout: 60_000, isolationLevel: 'RepeatableRead' },
    );
  }

  async affiliatesFile(actor: AffiliateActor, input: ExportInput) {
    return this.prisma.db.$transaction(
      async (tx) => {
        if (input.ids) {
          const found = await this.affiliates.countIds(tx, input.ids);
          if (found !== new Set(input.ids).size) throw notFound('Không tìm thấy đại lý');
        }
        const memberIds = input.q ? await this.members.searchIds(input.q, tx) : [];
        const lines: (string | number)[][] = [];
        let after: { date: Date; id: string } | undefined;
        for (;;) {
          const rows = await this.affiliates.page(
            { page: 1, size: BATCH, ...(input.q ? { q: input.q } : {}) },
            memberIds,
            input.ids,
            after,
            tx,
          );
          if (!rows.length) break;
          const [contacts, totals] = await Promise.all([
            this.members.byIds(
              rows.map((r) => r.userId),
              tx,
            ),
            this.affiliates.totals(
              rows.map((r) => r.id),
              undefined,
              tx,
            ),
          ]);
          const people = new Map(contacts.map((c) => [c.id, c])),
            stats = new Map(totals.map((s) => [s.affiliateId, s]));
          lines.push(
            ...rows.map((r) => [
              people.get(r.userId)?.fullName ?? '',
              r.code,
              people.get(r.userId)?.email ?? '',
              r.rate,
              stats.get(r.id)?.customers ?? 0,
              Number(stats.get(r.id)?.revenue ?? 0),
              Number(stats.get(r.id)?.balance ?? 0),
              Number(stats.get(r.id)?.paid ?? 0),
              'Tự động',
            ]),
          );
          const last = rows.at(-1);
          if (!last || rows.length < BATCH) break;
          after = { date: last.date, id: last.id };
        }
        await this.log(tx, actor, 'affiliates', lines.length, input);
        return {
          filename: 'dai-ly-affiliate.csv',
          csv: affiliateCsv(
            [
              'Đại lý',
              'Mã',
              'Email',
              'Tỷ lệ (%)',
              'Khách hàng',
              'Doanh thu',
              'Số dư',
              'Đã chi',
              'Trạng thái',
            ],
            lines,
          ),
        };
      },
      { timeout: 60_000, isolationLevel: 'RepeatableRead' },
    );
  }

  private log(tx: DbTx, actor: AffiliateActor, kind: string, count: number, input: ExportInput) {
    return this.audit.log(tx, {
      actorId: actor.id,
      ip: actor.ip,
      action: 'affiliate.export',
      entity: kind,
      entityId: input.ids?.join(',') ?? 'filtered',
      tag: 'affiliate',
      summary: `Xuất CSV ${count} dòng ${kind}`,
      diff: { ...input, count },
    });
  }
}
