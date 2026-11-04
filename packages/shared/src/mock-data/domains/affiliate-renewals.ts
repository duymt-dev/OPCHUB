import { recordMockRegionalShare } from './regional-shares';
import { isMockAffiliateScenarioSeeded } from './affiliate-demo-state';
import { affiliateMockState } from './affiliate';
import { regionalShareState } from './regional-share-state';
import { recordMockReference } from './affiliate-reference';
/** Mirrors seed/demo/affiliate-renewals; state persistence supplies the source-ID replay fence. */
export function seedMockAffiliateRenewals() {
  if (!isMockAffiliateScenarioSeeded()) return;
  const s = regionalShareState(),
    first = s.rows.find((r) => r.source === 'membership');
  if (!first || first.plan === 'fundraising' || affiliateMockState().referenceSeeded) return;
  affiliateMockState().referenceSeeded = true;
  for (const year of [2, 3, 4]) {
    const at = new Date(s.firstPaid.get(first.customerId) ?? first.recordedAt);
    at.setUTCFullYear(at.getUTCFullYear() + year - 1);
    const input = {
      source: 'membership',
      sourceId: `demo-reference-year-${year}`,
      customerId: first.customerId,
      plan: first.plan,
      baseAmount: first.baseAmount,
      at: at.toISOString(),
    } as const;
    recordMockReference(input, false);
    recordMockRegionalShare(input);
  }
}
