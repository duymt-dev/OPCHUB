import { affiliateSnapshotSchema } from './schema';
import {
  affiliateBridgeCommandSchema,
  affiliateBridgeHelloSchema,
  AFFILIATE_BRIDGE_CHANNEL,
} from './protocol';

const keyOf = (fixture: string) => `${AFFILIATE_BRIDGE_CHANNEL}:${fixture}`;

/** A lease runs under one Web Lock at the Portal origin, shared by both apps/tabs. */
export async function serveMockAffiliateLease(port: MessagePort, key: string, storage: Storage) {
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
        storage.setItem(key, JSON.stringify(command.data.snapshot));
        port.postMessage({ type: 'committed' });
        finish();
      } catch {
        fail();
      }
    };
    try {
      const raw = storage.getItem(key);
      const snapshot =
        raw === null ? null : affiliateSnapshotSchema.parse(JSON.parse(raw) as unknown);
      port.postMessage({ type: 'state', snapshot });
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
  return () => window.removeEventListener('message', receive);
}
