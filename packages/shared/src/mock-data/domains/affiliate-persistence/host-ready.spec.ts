import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMockAffiliateHost } from './host';
import { AFFILIATE_BRIDGE_CHANNEL } from './protocol';

afterEach(() => vi.unstubAllGlobals());

function host(referrer: string) {
  const postMessage = vi.fn();
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  vi.stubGlobal('window', { parent: { postMessage }, addEventListener, removeEventListener });
  vi.stubGlobal('document', { referrer });
  vi.stubGlobal('location', { hostname: 'localhost' });
  return { postMessage, addEventListener, removeEventListener };
}

describe('MSW-404-06 mock relay hydration readiness without a timer tick', () => {
  it('announces only readiness to the exact same-host parent origin after listener installation', () => {
    const env = host('http://localhost:3238/');
    const cleanup = installMockAffiliateHost();
    expect(env.postMessage).toHaveBeenCalledExactlyOnceWith(
      { channel: AFFILIATE_BRIDGE_CHANNEL, type: 'ready', fixture: 'base' },
      'http://localhost:3238',
    );
    expect(env.addEventListener.mock.invocationCallOrder[0]).toBeLessThan(
      env.postMessage.mock.invocationCallOrder[0]!,
    );
    cleanup();
    expect(env.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it.each(['', 'not-a-url', 'https://other.example/', 'javascript:alert(1)', 'file:///tmp'])(
    'does not announce to an untrusted or unavailable referrer: %s',
    (referrer) => {
      const env = host(referrer);
      installMockAffiliateHost()();
      expect(env.postMessage).not.toHaveBeenCalled();
      expect(env.addEventListener).toHaveBeenCalledOnce();
    },
  );
});
