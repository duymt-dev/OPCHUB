import { Injectable } from '@nestjs/common';
import { adminOnboardingOf, onboardingOf } from '@opchub/shared';
import type { AdminOnboarding, Onboarding, OnboardingFlag } from '@opchub/shared/api-domains';
import { OutboxService } from '@/common/outbox';
import type { OnboardingPort } from '@/modules/account';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OnboardingRepository } from '../repositories/onboarding.repository';

const DAY_MS = 24 * 3600 * 1000;
const SWEEP_BATCH = 500;

/**
 * V4-611 Hướng dẫn bắt đầu (D-85): tiến độ tính từ dữ liệu thật — snapshot một query cho cả lô;
 * `onboarding_progress` chỉ là bản sao cho bộ lọc Admin, làm mới qua outbox + sweep hằng ngày.
 */
@Injectable()
export class OnboardingService implements OnboardingPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: OnboardingRepository,
    private readonly outbox: OutboxService,
  ) {}

  /** null = NĐT / không phải thành viên (không có onboarding) */
  async mine(userId: string): Promise<Onboarding | null> {
    const snap = (await this.repo.snapshots([userId])).get(userId);
    return snap ? onboardingOf(snap) : null;
  }

  /** Cột "Khởi đầu" cho các dòng của một trang Admin — 2 query cố định, không theo số dòng */
  async forAdmin(ids: readonly string[], now = new Date()): Promise<Map<string, AdminOnboarding>> {
    const [snaps, reminded] = await Promise.all([
      this.repo.snapshots(ids),
      this.repo.remindedSince(ids, new Date(now.getTime() - DAY_MS)),
    ]);
    return new Map([...snaps].map(([id, s]) => [id, adminOnboardingOf(s, reminded.has(id))]));
  }

  /** Đặt cờ (idempotent); lần đầu → outbox tính lại tiến độ */
  async flag(userId: string, key: OnboardingFlag): Promise<void> {
    await this.prisma.db.$transaction(async (tx) => {
      if (await this.repo.setFlag(tx, userId, key))
        await this.outbox.add(tx, 'onboarding.touched', { userId });
    });
  }

  /** Tính lại + ghi `onboarding_progress` cho một lô (consumer outbox, sweep) */
  async refresh(ids: readonly string[]): Promise<void> {
    const snaps = await this.repo.snapshots([...new Set(ids)]);
    const done = new Map([...snaps].map(([id, s]) => [id, onboardingOf(s).done]));
    await this.repo.saveProgress(done);
  }

  /** Sweep hằng ngày: phí hết hạn, tin ở phòng không mặc định, dữ liệu trước V4-611 */
  async sweep(): Promise<number> {
    let after = '';
    let total = 0;
    for (;;) {
      const ids = await this.repo.memberIdsAfter(after, SWEEP_BATCH);
      if (!ids.length) return total;
      await this.refresh(ids);
      total += ids.length;
      after = ids[ids.length - 1] ?? after;
    }
  }

  /** Worker khởi động lần đầu sau migration: bảng trống → backfill */
  async backfillIfEmpty(): Promise<void> {
    if (!(await this.repo.hasProgress())) await this.sweep();
  }
}
