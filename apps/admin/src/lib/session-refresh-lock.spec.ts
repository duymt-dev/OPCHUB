import { afterEach, describe, expect, it, vi } from 'vitest';
import { withAdminRefreshLock } from './session-refresh-lock';

afterEach(() => vi.unstubAllGlobals());

describe('REQ-308 REQ-410 Admin refresh across concurrent tabs', () => {
  it('runs independent refresh callbacks serially under the same origin lock', async () => {
    let tail = Promise.resolve();
    const names: string[] = [];
    const request = (name: string, callback: () => Promise<boolean>) => {
      names.push(name);
      const result = tail.then(callback);
      tail = result.then(() => undefined);
      return result;
    };
    vi.stubGlobal('navigator', { locks: { request } });
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const events: string[] = [];
    const first = withAdminRefreshLock(async () => {
      events.push('first-start');
      await pending;
      events.push('first-end');
      return true;
    });
    const second = withAdminRefreshLock(() => {
      events.push('second-start');
      return Promise.resolve(true);
    });
    await Promise.resolve();
    expect(events).toEqual(['first-start']);
    release();
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(events).toEqual(['first-start', 'first-end', 'second-start']);
    expect(names).toEqual(['opchub:admin:refresh', 'opchub:admin:refresh']);
  });

  it('retains the existing refresh path when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const refresh = vi.fn().mockResolvedValue(true);
    expect(await withAdminRefreshLock(refresh)).toBe(true);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('fails closed if lock acquisition fails and never sends an unlocked refresh', async () => {
    vi.stubGlobal('navigator', {
      locks: { request: vi.fn().mockRejectedValue(new Error('lock')) },
    });
    const refresh = vi.fn().mockResolvedValue(true);
    expect(await withAdminRefreshLock(refresh)).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('preserves a denied refresh result inside the lock', async () => {
    vi.stubGlobal('navigator', {
      locks: { request: (_name: string, callback: () => Promise<boolean>) => callback() },
    });
    expect(await withAdminRefreshLock(() => Promise.resolve(false))).toBe(false);
  });
});
