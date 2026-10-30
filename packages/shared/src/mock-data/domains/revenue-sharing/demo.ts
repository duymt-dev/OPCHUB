import { mockDb } from '../store';
import { mockRevenueState } from './state';

/** Optional AF0 setup may follow initial state creation. Backfill epochs, never shares. */
export function seedMockRevenueEpochs(): void {
  const state = mockRevenueState();
  const first = new Map(state.first);
  for (const fee of mockDb().fees) {
    if (!fee.paidAt || fee.amount <= 0) continue;
    const old = first.get(fee.userId);
    if (old === fee.paidAt) continue;
    if (
      state.shares.some((row) => row.customerId === fee.userId) ||
      state.pending.some((row) => row.payload.receipt.customerId === fee.userId)
    ) {
      if (old && old < fee.paidAt) continue;
      throw new Error('Seed the affiliate demo before recording revenue');
    }
    first.set(fee.userId, fee.paidAt);
  }
  state.first = [...first];
}
