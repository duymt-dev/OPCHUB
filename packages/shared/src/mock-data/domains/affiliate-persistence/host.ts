import {
  readMockLeaseState,
  serializeMockLeaseState,
  type MockLeaseState,
} from '../community-persistence/lease-storage';
import {
  affiliateBridgeCommandSchema,
  affiliateBridgeHelloSchema,
  AFFILIATE_BRIDGE_CHANNEL,
} from './protocol';

const keyOf = (fixture: string) => `${AFFILIATE_BRIDGE_CHANNEL}:${fixture}`;

/** A lease runs under one Web Lock at the Portal origin, shared by both apps/tabs. */
export async function serveMockAffiliateLease(port: MessagePort, key: string, storage: Storage) {
  let previous: MockLeaseState = { snapshot: null };
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      port.close();
      resolve();
    };
    const fail = () => {
      port.postMessage({ type: 'error' });
      finish();
    };
    const timer = setTimeout(fail, 30_000);
    port.onmessage = (event: MessageEvent<unknown>) => {
      const command = affiliateBridgeCommandSchema.safeParse(event.data);
      if (!command.success) return fail();
      if (command.data.type === 'abort') return finish();
      try {
        // setItem is atomic; quota/corruption is an error, never truncate or reset the ledger.
        storage.setItem(
          key,
          serializeMockLeaseState(command.data.snapshot, command.data.communitySnapshot, previous),
        );
        port.postMessage({ type: 'committed' });
        finish();
      } catch {
        fail();
      }
    };
    try {
      previous = readMockLeaseState(storage.getItem(key));
      port.postMessage({ type: 'state', ...previous });
    } catch {
      fail();
    }
  });
}

/** Install ONLY on the public mock-only relay page; no native endpoint or credential crosses it. */
export function installMockAffiliateHost(): () => void {
  const receive = (event: MessageEvent<unknown>) => {
    const hello = affiliateBridgeHelloSchema.safeParse(event.data);
    if (!hello.success || event.source !== window.parent || event.origin === 'null') return;
    if (new URL(event.origin).hostname !== location.hostname) return;
    if (hello.data.type === 'ping') {
      window.parent.postMessage({ ...hello.data, type: 'ready' }, event.origin);
      return;
    }
    const port = event.ports[0];
    if (hello.data.type !== 'begin' || !port) return;
    if (!navigator.locks) {
      port.postMessage({ type: 'error' });
      return;
    }
    const key = keyOf(hello.data.fixture);
    void navigator.locks
      .request(key, () => serveMockAffiliateLease(port, key, localStorage))
      .catch(() => {
        port.postMessage({ type: 'error' });
        port.close();
      });
  };
  window.addEventListener('message', receive);
  // Announce after hydration: the parent's first ping can precede this listener.
  // Polling remains a fallback, but readiness must not depend on advancing timers.
  try {
    const parent = new URL(document.referrer);
    if (
      window.parent !== window &&
      parent.hostname === location.hostname &&
      (parent.protocol === 'http:' || parent.protocol === 'https:')
    )
      window.parent.postMessage(
        { channel: AFFILIATE_BRIDGE_CHANNEL, type: 'ready', fixture: 'base' },
        parent.origin,
      );
  } catch {
    // No usable referrer: respond only to the existing source/origin-validated ping.
  }
  return () => window.removeEventListener('message', receive);
}
