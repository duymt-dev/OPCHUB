import { Injectable, Logger } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type FundraisingMailKind, fundraisingMail, MailService } from '../../mail';
import { remindFrom } from '../domain/fundraising-status';
import { FundraisingRepository } from '../repositories/fundraising.repository';

const BATCH = 200;
/** Chặn vòng lặp vô hạn nếu dữ liệu bất thường */
const MAX_BATCHES = 50;

type DueRow = Awaited<ReturnType<FundraisingRepository['due']>>[number];

/**
 * V4-610 (D-82) job `scheduler.fundraisingStatus` 08:10 VN: khoản active quá hạn → `expired`
 * (tab Gọi vốn ẩn, dự án vẫn hiện); còn ≤ 14 ngày, chưa nhắc → nhắc gia hạn. Thông báo + email
 * cho chủ dự án; mỗi lô một transaction, cập nhật có điều kiện (chạy lại không gửi lần hai).
 */
@Injectable()
export class FundraisingSchedulerService {
  private readonly logger = new Logger(FundraisingSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: FundraisingRepository,
    private readonly mail: MailService,
    private readonly outbox: OutboxService,
  ) {}

  async run(now = new Date()): Promise<{ expired: number; reminded: number }> {
    const expired = await this.loop((tx) => this.expireBatch(tx, now));
    const reminded = await this.loop((tx) => this.remindBatch(tx, now));
    if (expired || reminded) this.logger.log({ expired, reminded }, 'Gói Gọi vốn');
    return { expired, reminded };
  }

  /** Mỗi lô trả số dòng đã xử lý; lô rỗng → dừng */
  private async loop(batch: (tx: DbTx) => Promise<number>): Promise<number> {
    let total = 0;
    for (let i = 0; i < MAX_BATCHES; i++) {
      const n = await this.prisma.db.$transaction(batch);
      total += n;
      if (n < BATCH) break;
    }
    return total;
  }

  private async expireBatch(tx: DbTx, now: Date): Promise<number> {
    const due = await this.repo.due(tx, 'active', now, BATCH);
    const done = new Set(
      await this.repo.expireMany(
        tx,
        due.map((r) => r.id),
        now,
      ),
    );
    await this.notify(
      tx,
      due.filter((r) => done.has(r.id)),
      'expired',
    );
    return done.size;
  }

  private async remindBatch(tx: DbTx, now: Date): Promise<number> {
    const due = await this.repo.toRemind(tx, now, remindFrom(now), BATCH);
    const done = new Set(
      await this.repo.claimReminders(
        tx,
        due.map((r) => r.id),
        now,
      ),
    );
    await this.notify(
      tx,
      due.filter((r) => done.has(r.id)),
      'renew',
    );
    return done.size;
  }

  private async notify(tx: DbTx, rows: DueRow[], kind: FundraisingMailKind): Promise<void> {
    if (!rows.length) return;
    const owners = new Map(
      (
        await this.repo.owners(
          tx,
          rows.map((r) => r.ownerId),
        )
      ).map((u) => [u.id, u]),
    );
    const mails = rows.flatMap((r) => {
      const u = owners.get(r.ownerId);
      if (!u?.email || !r.endsAt) return [];
      const m = fundraisingMail(kind, u.fullName, r.project.name, r.endsAt);
      return [{ to: u.email, kind: 'fundraising' as const, subject: m.subject, html: m.html }];
    });
    if (mails.length) await this.mail.requestMany(tx, mails);
    await this.outbox.add(tx, 'fundraising.reminded', {
      items: rows.map((r) => ({
        fundraisingId: r.id,
        projectId: r.projectId,
        projectName: r.project.name,
        ownerId: r.ownerId,
        amount: r.amount,
        kind,
        endsAt: (r.endsAt ?? new Date(0)).toISOString(),
      })),
    });
  }
}
