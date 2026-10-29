import { Injectable, Logger } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { StoreRepository } from '../repositories/store.repository';

/**
 * UP-03 / D-75 / D-114: consumer `membership_fee.trial_started` (đăng ký, CR-16) + `membership_fee.confirmed`
 * — TK Doanh nghiệp chưa có gian hàng → bản Nháp từ hồ sơ DN, `auto_created` (Portal mở thẳng trình tạo).
 * Idempotent (UQ owner_id); DN có từ trước V4.2 được migration `v42_store_builder` tạo Nháp.
 */
@Injectable()
export class StoreAutoCreateHandler {
  private readonly logger = new Logger(StoreAutoCreateHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MemberDirectory,
    private readonly stores: StoreRepository,
  ) {}

  onTrialStarted(p: OutboxPayload<'membership_fee.trial_started'>): Promise<void> {
    return this.ensure(p.userId);
  }

  onFeeConfirmed(p: OutboxPayload<'membership_fee.confirmed'>): Promise<void> {
    return this.ensure(p.userId);
  }

  private async ensure(userId: string): Promise<void> {
    const u = await this.members.businessSeed(userId);
    if (!u || u.accountType !== 'business') return;
    const bp = u.businessProfile;
    const created = await this.prisma.db.$transaction((tx) =>
      this.stores.createDraft(tx, {
        ownerId: userId,
        name: (bp?.companyName || u.fullName).slice(0, 120),
        province: bp?.province || u.city,
        phone: u.phone ?? '',
        email: u.email,
        website: bp?.website ?? '',
        address: bp?.address ?? '',
      }),
    );
    if (created) this.logger.log(`Tạo gian hàng nháp cho ${userId}`);
  }
}
