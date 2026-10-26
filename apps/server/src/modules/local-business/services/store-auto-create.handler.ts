import { Injectable, Logger } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { StoreRepository } from '../repositories/store.repository';

/**
 * UP-03 / D-75 / D-84: consumer `membership_fee.confirmed` — TK Doanh nghiệp chưa có gian hàng →
 * tạo bản nháp từ hồ sơ DN. Idempotent (UQ owner_id); DN đóng phí trước v4 có gian hàng ở lần đóng
 * phí kế tiếp (không tạo hàng loạt).
 */
@Injectable()
export class StoreAutoCreateHandler {
  private readonly logger = new Logger(StoreAutoCreateHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MemberDirectory,
    private readonly stores: StoreRepository,
  ) {}

  async onFeeConfirmed(p: OutboxPayload<'membership_fee.confirmed'>): Promise<void> {
    const u = await this.members.businessSeed(p.userId);
    if (!u || u.accountType !== 'business') return;
    const bp = u.businessProfile;
    const created = await this.prisma.db.$transaction((tx) =>
      this.stores.createDraft(tx, {
        ownerId: p.userId,
        name: (bp?.companyName || u.fullName).slice(0, 120),
        province: bp?.province || u.city,
        phone: u.phone ?? '',
        email: u.email,
        website: bp?.website ?? '',
        address: bp?.address ?? '',
      }),
    );
    if (created) this.logger.log(`Tạo gian hàng nháp cho ${p.userId}`);
  }
}
