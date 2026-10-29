import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { PriceConfig } from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface PriceRow extends PriceConfig {
  version: number;
  updatedAt: Date;
}

interface RawRow {
  per_list: number;
  per_year: number;
  biz_list: number;
  biz_year: number;
  fund_price: number;
  fund_renew: number;
  fund_months: number;
  version: number;
  updated_at: Date;
}

const toRow = (r: RawRow): PriceRow => ({
  per: { list: r.per_list, y: r.per_year },
  biz: { list: r.biz_list, y: r.biz_year },
  fund: { p: r.fund_price, r: r.fund_renew, mo: r.fund_months },
  version: r.version,
  updatedAt: r.updated_at,
});

const MISSING = 'Thiếu price_configs — chạy migrate deploy';

/** `price_configs` (một dòng id = 1) + `price_config_history` (chỉ thêm) */
@Injectable()
export class PriceConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<PriceRow> {
    const [r] = await this.prisma.db.$queryRaw<RawRow[]>`
      SELECT per_list, per_year, biz_list, biz_year, fund_price, fund_renew, fund_months, version,
        updated_at FROM price_configs WHERE id = 1`;
    if (!r) throw new Error(MISSING);
    return toRow(r);
  }

  async lock(tx: DbTx): Promise<PriceRow> {
    const [r] = await tx.$queryRaw<RawRow[]>`
      SELECT per_list, per_year, biz_list, biz_year, fund_price, fund_renew, fund_months, version,
        updated_at FROM price_configs WHERE id = 1 FOR UPDATE`;
    if (!r) throw new Error(MISSING);
    return toRow(r);
  }

  /** Ghi giá mới + ảnh chụp lịch sử cùng transaction của caller */
  async save(tx: DbTx, c: PriceConfig, version: number, by: string): Promise<PriceRow> {
    const [r] = await tx.$queryRaw<RawRow[]>`
      UPDATE price_configs SET per_list = ${c.per.list}, per_year = ${c.per.y},
        biz_list = ${c.biz.list}, biz_year = ${c.biz.y}, fund_price = ${c.fund.p},
        fund_renew = ${c.fund.r}, fund_months = ${c.fund.mo}, version = ${version},
        updated_by = ${by}, updated_at = now()
      WHERE id = 1
      RETURNING per_list, per_year, biz_list, biz_year, fund_price, fund_renew, fund_months, version,
        updated_at`;
    if (!r) throw new Error(MISSING);
    await tx.priceConfigHistory.create({
      data: {
        version,
        perList: c.per.list,
        perYear: c.per.y,
        bizList: c.biz.list,
        bizYear: c.biz.y,
        fundPrice: c.fund.p,
        fundRenew: c.fund.r,
        fundMonths: c.fund.mo,
        changedBy: by,
      },
    });
    return toRow(r);
  }

  /**
   * §27.2(5) + D-104: `membership_fees.amount` là số phải trả ở lần thanh toán KẾ TIẾP (giao dịch
   * mới) → theo giá gói hiện hành; kỳ đã thu (`membership_fee_periods`) giữ nguyên. Một câu UPDATE.
   */
  repriceFees(tx: DbTx, c: PriceConfig): Promise<number> {
    return tx.$executeRaw`
      UPDATE membership_fees SET
        amount = CASE plan WHEN 'business' THEN ${c.biz.y}::int ELSE ${c.per.y}::int END,
        updated_at = now()
      WHERE amount <> CASE plan WHEN 'business' THEN ${c.biz.y}::int ELSE ${c.per.y}::int END`;
  }
}
