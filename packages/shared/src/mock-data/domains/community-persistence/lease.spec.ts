import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetMockDb } from '../store';
import { captureMockAffiliateSnapshot } from '../affiliate-persistence/snapshot';
import { serveMockAffiliateLease } from '../affiliate-persistence/host';
import { captureCommunitySnapshot } from './snapshot';
import { readMockLeaseState } from './lease-storage';

const ports: MessagePort[] = [];
const storage = () => {
  const values = new Map<string, string>();
  const s: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    key: (index) => [...values.keys()][index] ?? null,
  };
  return s;
};
const next = (port: MessagePort) =>
  new Promise<unknown>((resolve) => {
    port.onmessage = (event: MessageEvent<unknown>) => resolve(event.data);
    port.start();
  });
function connect(s: Storage) {
  const channel = new MessageChannel();
  ports.push(channel.port1, channel.port2);
  const initial = next(channel.port2);
  const done = serveMockAffiliateLease(channel.port1, 'state', s);
  return { port: channel.port2, initial, done };
}
beforeEach(resetMockDb);
afterEach(() => ports.splice(0).forEach((port) => port.close()));

describe('REQ-208 REQ-411 composite relay commit preserves independent financial/community domains', () => {
  it('commits both payloads atomically and supplies both to the next lease', async () => {
    const s = storage();
    const affiliate = captureMockAffiliateSnapshot();
    const community = captureCommunitySnapshot();
    const first = connect(s);
    await first.initial;
    const ack = next(first.port);
    first.port.postMessage({ type: 'commit', snapshot: affiliate, communitySnapshot: community });
    expect(await ack).toEqual({ type: 'committed' });
    await first.done;
    expect(readMockLeaseState(s.getItem('state'))).toEqual({
      snapshot: affiliate,
      communitySnapshot: community,
    });
    const second = connect(s);
    expect(await second.initial).toEqual({
      type: 'state',
      snapshot: affiliate,
      communitySnapshot: community,
    });
    second.port.postMessage({ type: 'abort' });
    await second.done;
  });

  it('upgrades an existing legacy ledger without losing historical financial values', async () => {
    const s = storage();
    const affiliate = captureMockAffiliateSnapshot();
    s.setItem('state', JSON.stringify(affiliate));
    const lease = connect(s);
    expect(await lease.initial).toEqual({ type: 'state', snapshot: affiliate });
    const ack = next(lease.port);
    lease.port.postMessage({
      type: 'commit',
      snapshot: affiliate,
      communitySnapshot: captureCommunitySnapshot(),
    });
    expect(await ack).toEqual({ type: 'committed' });
    await lease.done;
    expect(readMockLeaseState(s.getItem('state')).snapshot).toEqual(affiliate);
  });

  it('a legacy caller can update its ledger without discarding an existing community payload', async () => {
    const s = storage();
    const affiliate = captureMockAffiliateSnapshot();
    const community = captureCommunitySnapshot();
    s.setItem(
      'state',
      JSON.stringify({
        kind: 'opchub-msw-domains',
        version: 2,
        affiliate,
        community,
      }),
    );
    const lease = connect(s);
    await lease.initial;
    const ack = next(lease.port);
    lease.port.postMessage({ type: 'commit', snapshot: affiliate });
    expect(await ack).toEqual({ type: 'committed' });
    await lease.done;
    expect(readMockLeaseState(s.getItem('state')).communitySnapshot).toEqual(community);
  });

  it('rejects an invalid community payload without partially updating a valid financial ledger', async () => {
    const s = storage();
    const affiliate = captureMockAffiliateSnapshot();
    const before = JSON.stringify(affiliate);
    s.setItem('state', before);
    const lease = connect(s);
    await lease.initial;
    const ack = next(lease.port);
    lease.port.postMessage({
      type: 'commit',
      snapshot: affiliate,
      communitySnapshot: { version: 1 },
    });
    expect(await ack).toEqual({ type: 'error' });
    await lease.done;
    expect(s.getItem('state')).toBe(before);
  });
});
