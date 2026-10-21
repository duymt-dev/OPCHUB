import { readMockLeaseState } from '../community-persistence/lease-storage';
import { AFFILIATE_BRIDGE_CHANNEL } from './protocol';

interface FeeStorageChange {
  key: string | null;
  url: string;
  oldValue: string | null;
  newValue: string | null;
}

/** A validated relay change is only an invalidation hint, never trusted session data. */
export function membershipChanged(
  event: FeeStorageChange,
  origin: string,
  fixture: 'base' | 'affiliate',
  userId: string,
): boolean {
  if (event.key !== `${AFFILIATE_BRIDGE_CHANNEL}:${fixture}` || !event.newValue) return false;
  try {
    const source = new URL(event.url);
    if (
      source.origin !== origin ||
      source.pathname !== '/mock-affiliate-state' ||
      source.search ||
      source.hash
    )
      return false;
    const signature = (raw: string | null) => {
      const fee = readMockLeaseState(raw).snapshot?.fees.find((row) => row.userId === userId);
      return fee ? JSON.stringify([fee.status, fee.validUntil, fee.memberCode, fee.amount]) : null;
    };
    return signature(event.oldValue) !== signature(event.newValue);
  } catch {
    return false;
  }
}

export function subscribeMockMembership(userId: string, onChange: () => void): () => void {
  const receive = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return;
    const fixture = document.cookie.split('; ').includes('opchub-mock-affiliate-demo=1')
      ? 'affiliate'
      : 'base';
    if (membershipChanged(event, location.origin, fixture, userId)) onChange();
  };
  window.addEventListener('storage', receive);
  return () => window.removeEventListener('storage', receive);
}
