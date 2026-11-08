import { Injectable, Logger } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type FundraisingMailKind } from '../../mail';
import { FundraisingReminderDeliveryService } from './fundraising-reminder-delivery.service';
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
    private readonly delivery: FundraisingReminderDeliveryService,
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
      now,
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
      now,
    );
    return done.size;
  }

  private async notify(
    tx: DbTx,
    rows: DueRow[],
    kind: FundraisingMailKind,
    now: Date,
  ): Promise<void> {
    await this.delivery.deliver(tx, rows, kind, now);
  }
}
