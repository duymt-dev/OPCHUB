import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { affiliateCodeSchema, type AffiliateCodeResult } from '@opchub/shared/api-domains';
import { createHash } from 'node:crypto';
import { AppError } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';
import {
  FEE_READER,
  type FeeReader,
  MemberDirectory,
  ReferralRegistry,
  type ReferralPort,
} from '../../account';
import { monthKey } from '../domain/month-key';
import { CommissionRepository } from '../repositories/commission.repository';
import { ReferralRepository } from '../repositories/referral.repository';
import { PolicyRepository } from '../repositories/policy.repository';

export const REFERRAL_MESSAGES = {
  not_found: 'Mã giới thiệu không tồn tại',
  self: 'Không thể dùng mã giới thiệu của chính bạn',
  paused: 'Mã giới thiệu đang tạm dừng (đại lý hết hạn phí thành viên)',
} as const;
const invalid = (reason: keyof typeof REFERRAL_MESSAGES): AffiliateCodeResult => ({
  valid: false,
  reason,
  message: REFERRAL_MESSAGES[reason],
});

/** AF-R03/R04: cổng Account; không có phụ thuộc vòng giữa hai module. */
@Injectable()
export class ReferralCodeService implements ReferralPort, OnModuleInit {
  constructor(
    private readonly registry: ReferralRegistry,
    private readonly repo: ReferralRepository,
    private readonly commissions: CommissionRepository,
    private readonly members: MemberDirectory,
    private readonly policies: PolicyRepository,
    private readonly redis: RedisService,
    @Inject(FEE_READER) private readonly fees: FeeReader,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(code: string, email = '', tx?: DbTx, now = new Date()): Promise<AffiliateCodeResult> {
    const parsed = affiliateCodeSchema.safeParse(code);
    if (!parsed.success) return invalid('not_found');
    const affiliate = await this.repo.code(parsed.data, tx);
    if (!affiliate) return invalid('not_found');
    const owner = await this.members.byId(affiliate.userId, tx);
    if (!owner) return invalid('not_found');
    if (owner.email.toLowerCase() === email.trim().toLowerCase()) return invalid('self');
    const fee = await this.fees.feeOf(affiliate.userId);
    if (
      affiliate.status === 'paused' ||
      !fee?.validUntil ||
      fee.validUntil < now ||
      (fee.status !== 'active' && fee.status !== 'expiring')
    )
      return invalid('paused');
    const policy = await this.policies.get(tx);
    return { valid: true, affiliateName: owner.fullName, cookieDays: policy.cookieDays };
  }

  async validate(code: string, email: string): Promise<void> {
    this.assert(await this.check(code, email));
  }

  async attach(tx: DbTx, userId: string, code: string): Promise<void> {
    const member = await this.members.byId(userId, tx);
    if (!member) throw new AppError('NOT_FOUND', 'Không tìm thấy thành viên');
    this.assert(await this.check(code, member.email, tx));
    const affiliate = await this.repo.code(code, tx);
    if (!affiliate) throw new AppError('CONFLICT', REFERRAL_MESSAGES.not_found);
    await this.commissions.addReferral(tx, {
      affiliateId: affiliate.id,
      affiliateCode: affiliate.code,
      referredUserId: userId,
      monthKey: monthKey(new Date()),
    });
  }

  async click(code: string, ip: string, now = new Date()): Promise<void> {
    const parsed = affiliateCodeSchema.parse(code);
    const result = await this.check(parsed, '', undefined, now);
    if (!result.valid) return;
    const affiliate = await this.repo.code(parsed);
    if (!affiliate) return;
    const fingerprint = createHash('sha256').update(`${ip}:${parsed}`).digest('hex');
    const key = `affiliate:click:${fingerprint}`;
    if ((await this.redis.client.set(key, '1', 'EX', 3600, 'NX')) !== 'OK') return;
    try {
      // Ngày VN được lưu date, không phụ thuộc TZ của process/phiên PostgreSQL.
      const day = new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
      await this.repo.click(affiliate.id, new Date(`${day}T00:00:00Z`));
    } catch (error) {
      await this.redis.client.del(key);
      throw error;
    }
  }

  private assert(result: AffiliateCodeResult): void {
    if (!result.valid)
      throw new AppError('VALIDATION_ERROR', result.message, [
        { path: 'referralCode', message: result.message },
      ]);
  }
}
