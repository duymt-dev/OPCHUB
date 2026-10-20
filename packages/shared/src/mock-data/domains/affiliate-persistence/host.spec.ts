import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMockDb } from '../store';
import { captureMockAffiliateSnapshot } from './snapshot';
import { serveMockAffiliateLease } from './host';

const ports: MessagePort[] = [];
function memory(): Storage {
  const values = new Map<string, string>();
  return {
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
}
const next = (port: MessagePort): Promise<unknown> =>
  new Promise((resolve) => {
    port.onmessage = (event: MessageEvent<unknown>) => resolve(event.data);
    port.start();
  });
function connect(storage: Storage) {
  const channel = new MessageChannel();
  ports.push(channel.port1, channel.port2);
  const initial = next(channel.port2);
  const done = serveMockAffiliateLease(channel.port1, 'test', storage);
  return { port: channel.port2, initial, done };
}
beforeEach(resetMockDb);
afterEach(() => {
  ports.splice(0).forEach((port) => port.close());
});

describe('MSW Affiliate relay lease durability (not a replacement for cross-origin browser tests)', () => {
  it('acknowledges only after writing the complete validated ledger', async () => {
    const storage = memory();
    const lease = connect(storage);
    expect(await lease.initial).toEqual({ type: 'state', snapshot: null });
    const snapshot = captureMockAffiliateSnapshot();
    const ack = next(lease.port);
    lease.port.postMessage({ type: 'commit', snapshot });
    expect(await ack).toEqual({ type: 'committed' });
    await lease.done;
    expect(JSON.parse(storage.getItem('test') ?? '') as unknown).toEqual(snapshot);
  });
  it('returns persisted state to a fresh lease without replaying a mutation', async () => {
    const storage = memory();
    const snapshot = captureMockAffiliateSnapshot();
    storage.setItem('test', JSON.stringify(snapshot));
    const lease = connect(storage);
    expect(await lease.initial).toEqual({ type: 'state', snapshot });
    lease.port.postMessage({ type: 'abort' });
    await lease.done;
    expect(storage.getItem('test')).toBe(JSON.stringify(snapshot));
  });
  it('rejects corrupted storage instead of silently resetting financial history', async () => {
    const storage = memory();
    storage.setItem('test', 'corrupt');
    const lease = connect(storage);
    expect(await lease.initial).toEqual({ type: 'error' });
    await lease.done;
    expect(storage.getItem('test')).toBe('corrupt');
  });
  it('does not acknowledge quota failure or truncate the previous ledger', async () => {
    const storage = memory();
    storage.setItem('test', JSON.stringify(captureMockAffiliateSnapshot()));
    const before = storage.getItem('test');
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const lease = connect(storage);
    await lease.initial;
    const ack = next(lease.port);
    lease.port.postMessage({ type: 'commit', snapshot: captureMockAffiliateSnapshot() });
    expect(await ack).toEqual({ type: 'error' });
    await lease.done;
    expect(storage.getItem('test')).toBe(before);
  });
  it('rejects invalid or credential-bearing commands before writing', async () => {
    const storage = memory();
    const lease = connect(storage);
    await lease.initial;
    const ack = next(lease.port);
    lease.port.postMessage({
      type: 'commit',
      snapshot: { ...captureMockAffiliateSnapshot(), accessToken: 'not-allowed' },
    });
    expect(await ack).toEqual({ type: 'error' });
    await lease.done;
    expect(storage.length).toBe(0);
  });
});
