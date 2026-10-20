import { affiliateBankSchema, type AffiliateBank } from '@opchub/shared/api-domains';

/** Mock backend durability across page reloads, isolated to this browser tab/test context.
 * Never used by the feature or native API; no auth/referral data is stored here.
 */
const key = (userId: string) => `opchub-msw-affiliate-bank:${userId}`;
export function readMockBank(userId: string): AffiliateBank | null {
  try {
    const value = sessionStorage.getItem(key(userId));
    if (!value) return null;
    const parsed = affiliateBankSchema.safeParse(JSON.parse(value) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function persistMockBank(userId: string, bank: AffiliateBank): void {
  try {
    sessionStorage.setItem(key(userId), JSON.stringify(bank));
  } catch {
    /* Storage may be denied: in-memory handler state still works. */
  }
}
