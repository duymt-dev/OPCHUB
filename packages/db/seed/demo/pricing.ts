import { PRICE_DEFAULTS as prices } from '@opchub/shared/fixtures';
import type { DbTx } from '../../src/client';

/** Demo reset only. The required/production seed deliberately preserves Admin prices. */
export async function seedDemoPricing(tx: DbTx): Promise<void> {
  await tx.priceConfig.update({
    where: { id: 1 },
    data: {
      perList: prices.per.list,
      perYear: prices.per.y,
      bizList: prices.biz.list,
      bizYear: prices.biz.y,
      fundPrice: prices.fund.p,
      fundRenew: prices.fund.r,
      fundMonths: prices.fund.mo,
    },
  });
}
