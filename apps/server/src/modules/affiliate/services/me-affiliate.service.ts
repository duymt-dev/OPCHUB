import { Inject, Injectable } from '@nestjs/common';
import {
  affiliateBankSchema,
  type AffiliateBank,
  type AffiliatePageQuery,
  type MyAffiliate,
} from '@opchub/shared/api-domains';
import { isFeeUsable } from '@opchub/shared';
import { ENV, type Env } from '@/common/config';
import { conflict } from '@/common/errors';
import { PriceConfigService } from '@/modules/pricing';
import { FEE_READER, type FeeReader, MemberDirectory } from '../../account';
import { commissionAmount } from '../domain/commission-amount';
import { monthKey } from '../domain/month-key';
import {
  MeAffiliateRepository,
  type AffiliateSelfRow,
} from '../repositories/me-affiliate.repository';
import { PolicyRepository } from '../repositories/policy.repository';

export const affiliateBankOf = (
  row: Pick<AffiliateSelfRow, 'bankName' | 'bankNo' | 'bankHolder'>,
) => {
  const parsed = affiliateBankSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
};

@Injectable()
export class MeAffiliateService {
  constructor(
    private readonly repo: MeAffiliateRepository,
    private readonly policies: PolicyRepository,
    private readonly members: MemberDirectory,
    @Inject(FEE_READER) private readonly fees: FeeReader,
    @Inject(ENV) private readonly env: Env,
    private readonly prices: PriceConfigService,
  ) {}

  async mine(userId: string, now = new Date()): Promise<MyAffiliate> {
    const [row, policy, fee, prices] = await Promise.all([
      this.repo.byUser(userId),
      this.policies.get(),
      this.fees.feeOf(userId),
      this.prices.current(),
    ]);
    const rate = row?.rate ?? policy.defaultRate;
    const preview = {
      rate,
      // Q-V4-602-3: người được giới thiệu chọn gói khi đóng phí → hứa mức thấp nhất (Gói Cá nhân)
      perAmount: commissionAmount(prices.per.y, rate),
      cookieDays: policy.cookieDays,
    };
    if (!row) return { state: 'locked', policy: preview };
    // V-11: một cổng phí dùng chung (trial còn hạn cũng dùng được; affiliate mọi TV ở V42-707)
    const usable = isFeeUsable(fee, now);
    const today = new Date(
      new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10) + 'T00:00:00Z',
    );
    return {
      state: row.status === 'paused' || !usable ? 'paused' : 'active',
      policy: preview,
      code: row.code,
      link: `${this.env.PORTAL_URL.replace(/\/$/, '')}/r/${row.code}`,
      bank: affiliateBankOf(row),
      stats: await this.repo.stats(
        row.id,
        monthKey(now),
        new Date(today.getTime() - 29 * 86400_000),
      ),
    };
  }

  async referrals(userId: string, q: AffiliatePageQuery) {
    const row = await this.require(userId);
    const data = await this.repo.referrals(row.id, q);
    const contacts = await this.members.byIds(data.items.map((r) => r.customerId));
    const names = new Map(contacts.map((c) => [c.id, c.fullName]));
    return {
      ...data,
      items: data.items.map((r) => {
        const fullName = names.get(r.customerId);
        const words = fullName?.trim().split(/\s+/) ?? [];
        const name = !fullName
          ? 'Thành viên đã xóa'
          : words.length > 1
            ? `${words.slice(0, -1).join(' ')} ${words.at(-1)?.[0] ?? ''}.`
            : fullName;
        return { ...r, name, date: r.date.toISOString(), plan: 'Phí thành viên 12 tháng' };
      }),
      page: q.page,
      size: q.size,
      total: data.summary.count,
    };
  }

  async payouts(userId: string, q: AffiliatePageQuery) {
    const row = await this.require(userId);
    const data = await this.repo.payouts(row.id, q);
    return {
      items: data.rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        paidAt: r.paidAt.toISOString(),
        bank: affiliateBankSchema.parse(r.bank),
      })),
      page: q.page,
      size: q.size,
      total: data.total,
    };
  }

  async bank(userId: string, bank: AffiliateBank) {
    await this.require(userId);
    await this.repo.bank(userId, bank);
    return bank;
  }

  private async require(userId: string) {
    const row = await this.repo.byUser(userId);
    if (!row) throw conflict('Đóng phí thành viên để nhận link giới thiệu');
    return row;
  }
}
