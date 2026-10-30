import type { AffiliateBank } from '../../../api-domains';
import { mockDirectorState } from './state';

export function saveMockRecipientBank(directorId: string, bank: AffiliateBank | null) {
  const state = mockDirectorState();
  const row = state.recipientBanks.find((r) => r.directorId === directorId);
  if (row) row.bank = structuredClone(bank);
  else state.recipientBanks.push({ directorId, bank: structuredClone(bank) });
}

/** Undefined means no retained record; null means deliberately cleared. */
export function mockRecipientBank(directorId: string): AffiliateBank | null | undefined {
  const state = mockDirectorState();
  const current = state.config.slots.find((s) => s.incumbent?.id === directorId);
  return structuredClone(
    current ? current.bank : state.recipientBanks.find((r) => r.directorId === directorId)?.bank,
  );
}
