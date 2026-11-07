import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMockRoomReload } from './use-mock-room-reload';

const bridge = vi.hoisted(() => ({
  subscribe: vi.fn<(listener: (rooms: readonly string[]) => void) => () => void>(),
  unsubscribe: vi.fn(),
}));
vi.mock('@opchub/shared/mock-affiliate-browser', () => ({
  subscribeMockChatRooms: bridge.subscribe,
}));
beforeEach(() => {
  vi.clearAllMocks();
  bridge.subscribe.mockReturnValue(bridge.unsubscribe);
});

describe('REQ-060 mock live room subscription lifecycle', () => {
  it('leaves the native socket path untouched when mock subscription is disabled', async () => {
    const qc = new QueryClient();
    const reload = vi.fn(() => Promise.resolve());
    const view = renderHook(() => useMockRoomReload(qc, false, reload));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bridge.subscribe).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    view.unmount();
    qc.clear();
  });
  it('passes only the dirty rooms to the existing query reload and unsubscribes on unmount', async () => {
    const qc = new QueryClient();
    const reload = vi.fn(() => Promise.resolve());
    const view = renderHook(() => useMockRoomReload(qc, true, reload));
    await waitFor(() => expect(bridge.subscribe).toHaveBeenCalledTimes(1));
    const listener = bridge.subscribe.mock.calls[0]?.[0];
    if (!listener) throw new Error('Missing subscription');
    listener(['c1-general', 'c2-general']);
    // Reload follows the asynchronous MSW activation acknowledgement now.
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
    expect(reload.mock.calls).toEqual([
      [qc, 'c1-general'],
      [qc, 'c2-general'],
    ]);
    view.unmount();
    expect(bridge.unsubscribe).toHaveBeenCalledTimes(1);
    qc.clear();
  });
  it('does not install a late dynamic subscription after the chat unmounts', async () => {
    const qc = new QueryClient();
    const view = renderHook(() =>
      useMockRoomReload(
        qc,
        true,
        vi.fn(() => Promise.resolve()),
      ),
    );
    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bridge.subscribe).not.toHaveBeenCalled();
    expect(bridge.unsubscribe).not.toHaveBeenCalled();
    qc.clear();
  });
});
