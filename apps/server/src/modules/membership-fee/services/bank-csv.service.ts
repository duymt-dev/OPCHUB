import { Injectable } from '@nestjs/common';
import { bankCursorSchema, type BankTxnQuery } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { toCsv, csvSafeText as safe } from '@/common/http/csv';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BankTransactionsRepository } from '../repositories/bank-transactions.repository';

const LABELS = {
  matched: 'Đã khớp · tự kích hoạt',
  manual: 'Gán thủ công',
  unmatched: 'Không khớp nội dung',
  short: 'Thiếu tiền',
};
@Injectable()
export class BankCsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txns: BankTransactionsRepository,
    private readonly audit: AuditService,
  ) {}
  export(actor: { id: string; ip: string | null }) {
    return this.prisma.db.$transaction(
      async (tx) => {
        let cursor: BankTxnQuery['cursor'];
        const rows: (string | number)[][] = [];
        // Bounded keyset batches, never one query per transaction/member.
        for (;;) {
          const page = await this.txns.page({ cursor, limit: 500 }, tx);
          rows.push(
            ...page.items.map((r) => [
              new Date(r.receivedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
              r.amount,
              safe(r.content),
              safe(r.memberName ?? ''),
              r.shortRecorded ? 'Thiếu tiền · đã ghi nhận' : LABELS[r.status],
            ]),
          );
          if (!page.nextCursor) break;
          cursor = bankCursorSchema.parse(JSON.parse(page.nextCursor));
        }
        await this.audit.log(tx, {
          actorId: actor.id,
          ip: actor.ip,
          action: 'fee.bank_export',
          entity: 'payment_transaction',
          entityId: 'bank',
          tag: 'member',
          summary: 'Xuất CSV đối soát ngân hàng',
          diff: { count: rows.length },
        });
        return {
          filename: 'doi-soat-ngan-hang.csv',
          csv: toCsv(['Thời gian', 'Số tiền', 'Nội dung', 'Thành viên', 'Trạng thái'], rows),
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 30_000 },
    );
  }
}
