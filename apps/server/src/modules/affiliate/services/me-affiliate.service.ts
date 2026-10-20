import { Inject, Injectable } from '@nestjs/common';
import {
  affiliateBankSchema,
  type AffiliateBank,
  type AffiliatePageQuery,
  type MyAffiliate,
} from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { conflict } from '@/common/errors';
import { FEE_READER, type FeeReader } from '../../account';
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
    @Inject(FEE_READER) private readonly fees: FeeReader,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async mine(userId: string, now = new Date()): Promise<MyAffiliate> {
    const [row, policy, fee] = await Promise.all([
      this.repo.byUser(userId),
      this.policies.get(),
      this.fees.feeOf(userId),
    ]);
    const rate = row?.rate ?? policy.defaultRate;
    const preview = {
      rate,
      perAmount: Math.floor(((fee?.amount ?? 600_000) * rate) / 100),
      cookieDays: policy.cookieDays,
    };
    if (!row) return { state: 'locked', policy: preview };
    const usable =
      fee?.validUntil &&
      fee.validUntil >= now &&
      (fee.status === 'active' || fee.status === 'expiring');
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
    return {
      ...data,
      items: data.items.map((r) => {
        const words = r.name.trim().split(/\s+/);
        const name =
          words.length > 1 ? `${words.slice(0, -1).join(' ')} ${words.at(-1)?.[0] ?? ''}.` : r.name;
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
