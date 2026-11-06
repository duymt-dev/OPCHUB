import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatUnreadKey, clearRoomUnread } from '@/lib/chat-unread';
import { useMarkRead } from './use-mark-read';
import { useRoomActions } from './use-room-actions';
import * as api from '../api';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@opchub/ui', () => ({ useToast: () => vi.fn() }));
vi.mock('../api', async (original) => ({ ...(await original<typeof api>()), markRead: vi.fn() }));

let qc: QueryClient;
const markRead = vi.fn<(room: string) => Promise<unknown>>();
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
const input = (roomId = 'a', unread = 2, latestId = 'm1') => ({
  roomId,
  groupId: 'g',
  unread,
  latestId,
  markRead,
});
const tick = async (ms = 300) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  markRead.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  qc.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('REQ-622 BR-461 useMarkRead', () => {
  it('room switch: only unread rooms once, including ten revisits', async () => {
    const h = renderHook(useMarkRead, { wrapper: Wrapper, initialProps: input() });
    await tick(0);
    h.rerender(input('b', 2, 'b1'));
    await tick(0);
    for (let i = 0; i < 10; i++) {
      h.rerender(input(i % 2 ? 'b' : 'a', 0, i % 2 ? 'b1' : 'm1'));
    }
    await tick();
    expect(markRead.mock.calls).toEqual([['a'], ['b']]);
  });

  it('new message while open: five arrivals in one second are debounced with unread zero', async () => {
    const h = renderHook(useMarkRead, { wrapper: Wrapper, initialProps: input('a', 0) });
    for (let i = 2; i <= 6; i++) {
      h.rerender(input('a', 0, `m${i}`));
      await tick(200);
    }
    await tick();
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it('stale refetch does not cancel a pending new-message debounce or repeat an attempt', async () => {
    const h = renderHook(useMarkRead, { wrapper: Wrapper, initialProps: input('a', 0) });
    h.rerender(input('a', 0, 'm2'));
    await tick(100);
    h.rerender(input('a', 7, 'm2'));
    await tick(200);
    expect(markRead).toHaveBeenCalledTimes(1);
    h.rerender(input('a', 8, 'm2'));
    await tick(1000);
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it('one in-flight request and only the latest queued message', async () => {
    let finish: (() => void) | undefined;
    markRead.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const h = renderHook(useMarkRead, { wrapper: Wrapper, initialProps: input() });
    h.rerender(input('a', 0, 'm2'));
    await tick();
    h.rerender(input('a', 0, 'm3'));
    await tick();
    expect(markRead).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish?.();
      await Promise.resolve();
    });
    expect(markRead).toHaveBeenCalledTimes(2);
    h.rerender(input('a', 6, 'm3'));
    await tick();
    expect(markRead).toHaveBeenCalledTimes(2);
  });

  it('own message keeps latestId of the other sender: no mark', async () => {
    const h = renderHook(useMarkRead, { wrapper: Wrapper, initialProps: input('a', 0) });
    h.rerender({ ...input('a', 0) });
    await tick();
    expect(markRead).not.toHaveBeenCalled();
  });

  it('403 is attempted once, even after stale unread rerenders', async () => {
    markRead.mockRejectedValue(new Error('403'));
    const h = renderHook(useMarkRead, { wrapper: Wrapper, initialProps: input() });
    await tick();
    h.rerender(input('a', 9));
    await tick(5000);
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it('settled failed mutation invalidates the unread counter once without automatic retry', async () => {
    vi.mocked(api.markRead).mockRejectedValue(new Error('403'));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const h = renderHook(() => useRoomActions(null), { wrapper: Wrapper });
    await act(async () => {
      await expect(h.result.current.markRead('a')).rejects.toThrow('403');
    });
    expect(api.markRead).toHaveBeenCalledTimes(1);
    expect(invalidate.mock.calls.filter(([arg]) => arg?.queryKey === chatUnreadKey)).toHaveLength(
      1,
    );
  });

  it('clearRoomUnread records an absent key and subtracts only that room', () => {
    qc.setQueryData(chatUnreadKey, { total: 5, byGroup: { g: 5 }, byRoom: { b: 3, a: 2 } });
    clearRoomUnread(qc, 'g', 'a');
    expect(qc.getQueryData(chatUnreadKey)).toEqual({
      total: 3,
      byGroup: { g: 3 },
      byRoom: { b: 3, a: 0 },
    });
    clearRoomUnread(qc, 'g', 'c');
    expect(qc.getQueryData(chatUnreadKey)).toEqual({
      total: 3,
      byGroup: { g: 3 },
      byRoom: { b: 3, a: 0, c: 0 },
    });
  });
});
