import { mockDb, type MockDb } from './store';
import type { RegionalRegion, RegionalSlot } from '../../api-domains/regional-directors';
import { regionalBankSchema } from '../../api-domains/regional-directors';
const banks = new WeakMap<MockDb, Map<string, RegionalSlot['bank']>>();
export function regionalMockBanks() {
  let value = banks.get(mockDb());
  if (!value) {
    value = new Map();
    banks.set(mockDb(), value);
  }
  return value;
}
export function rememberRegionalBank(
  region: RegionalRegion,
  userId: string,
  bank: RegionalSlot['bank'],
) {
  const parsed = regionalBankSchema.safeParse(bank);
  if (parsed.success) regionalMockBanks().set(`${region}:${userId}`, parsed.data);
}
