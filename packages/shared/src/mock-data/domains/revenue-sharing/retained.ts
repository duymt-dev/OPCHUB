import { revenueRetainedSchema } from '../../../api-domains';
import { drainMockRevenue } from './capture';

/** Same scopes as the native daily read-model; never subtract reference commissions. */
export function mockRevenueRetained() {
  const shares = drainMockRevenue().shares;
  const sum = (attributed: boolean) =>
    shares
      .reduce(
        (n, row) =>
          n + (!attributed || row.affiliateId !== null ? BigInt(row.mediaSoftAmount) : 0n),
        0n,
      )
      .toString();
  return revenueRetainedSchema.parse({ allReceipts: sum(false), affiliateAttributed: sum(true) });
}
