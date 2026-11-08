import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { URL as NodeURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

interface WorkerEvent {
  data?: { json: () => unknown };
  notification?: { close: () => void; data: { link: string } };
  waitUntil: (pending: Promise<unknown>) => void;
}
function harness() {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined),
    focus = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([{ url: 'https://app.invalid/chat/one', focus }]);
  const self = {
    location: { origin: 'https://app.invalid' },
    registration: { scope: 'https://app.invalid/', showNotification },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { openWindow, matchAll, claim: vi.fn().mockResolvedValue(undefined) },
    addEventListener: (name: string, listener: (event: WorkerEvent) => void) =>
      listeners.set(name, listener),
  };
  runInNewContext(readFileSync(resolve('public/sw.js'), 'utf8'), {
    self,
    URL: NodeURL,
  });
  async function dispatch(name: string, input: Omit<WorkerEvent, 'waitUntil'>) {
    const pending: Promise<unknown>[] = [];
    listeners.get(name)?.({ ...input, waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
  }
  return { listeners, showNotification, openWindow, focus, matchAll, dispatch };
}
describe('D-137 actual service worker script', () => {
  it('shows a tagged notification, keeps only a same-origin click path and registers no fetch/cache handler', async () => {
    const h = harness();
    await h.dispatch('push', {
      data: { json: () => ({ title: 'T', body: 'B', tag: 'n', link: '/chat/one' }) },
    });
    expect(h.showNotification).toHaveBeenCalledWith(
      'T',
      expect.objectContaining({
        body: 'B',
        tag: 'n',
        data: { link: '/chat/one' },
        icon: '/icons/icon-192.png',
      }),
    );
    expect(h.listeners.has('fetch')).toBe(false);
  });
  it('ignores malformed push data rather than displaying unvalidated content', async () => {
    const h = harness();
    await h.dispatch('push', {
      data: {
        json: () => {
          throw new Error('invalid json');
        },
      },
    });
    await h.dispatch('push', { data: { json: () => ({ title: 'T' }) } });
    expect(h.showNotification).not.toHaveBeenCalled();
  });
  it('focuses an existing target tab instead of opening a duplicate', async () => {
    const h = harness(),
      close = vi.fn();
    await h.dispatch('notificationclick', { notification: { close, data: { link: '/chat/one' } } });
    expect(close).toHaveBeenCalledTimes(1);
    expect(h.focus).toHaveBeenCalledTimes(1);
    expect(h.openWindow).not.toHaveBeenCalled();
  });
  it.each(['//evil.invalid', '/%2fevil.invalid', '/%5cevil.invalid'])(
    'never opens an external click target %s',
    async (link) => {
      const h = harness();
      h.matchAll.mockResolvedValue([]);
      await h.dispatch('notificationclick', { notification: { close: vi.fn(), data: { link } } });
      expect(h.openWindow).toHaveBeenCalledWith('https://app.invalid/dashboard');
    },
  );
});
