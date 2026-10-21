import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useCan } from '@/lib/permissions';
import * as api from '../api';
import { botTestContext } from '../tests/context';
import { useBotEmergency } from './use-bot-emergency';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  emergencyStop: vi.fn(),
  hideBotMessages: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCan).mockReturnValue(true);
  vi.mocked(api.emergencyStop).mockResolvedValue({ enabled: false, stopped: 2 });
  vi.mocked(api.hideBotMessages).mockResolvedValue({ hidden: 3, rooms: 1 });
});
afterEach(cleanup);

describe('REQ-141 emergency mutations', () => {
  it('view-only refuses both writes even when called directly', async () => {
    vi.mocked(useCan).mockReturnValue(false);
    const { result } = renderHook(useBotEmergency, botTestContext());
    await act(async () => {
      expect(await result.current.execute({ kind: 'stop' })).toBe(false);
      expect(await result.current.execute({ kind: 'hide' })).toBe(false);
    });
    expect(api.emergencyStop).not.toHaveBeenCalled();
    expect(api.hideBotMessages).not.toHaveBeenCalled();
  });

  it('stops without losing settings and invalidates threads/activity/messages', async () => {
    const context = botTestContext();
    const settings = {
      enabled: true,
      delayMinutes: 5,
      topics: ['Topic'],
      autoGenerate: false,
      replyToMembers: true,
    };
    context.client.setQueryData(api.botKeys.settings(), settings);
    context.client.setQueryData(api.botKeys.threads(), { items: [] });
    context.client.setQueryData(api.botKeys.activity(), { items: [], todayCount: 0 });
    context.client.setQueryData(['admin-messages', 'c1-general'], { items: [] });
    const { result } = renderHook(useBotEmergency, context);
    await act(async () => {
      expect(await result.current.execute({ kind: 'stop' })).toBe(true);
    });
    expect(context.client.getQueryData(api.botKeys.settings())).toEqual({
      ...settings,
      enabled: false,
    });
    for (const key of [
      api.botKeys.threads(),
      api.botKeys.activity(),
      ['admin-messages', 'c1-general'],
    ]) {
      expect(context.client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it('guards simultaneous duplicate submissions synchronously', async () => {
    let finish!: (value: { enabled: false; stopped: number }) => void;
    vi.mocked(api.emergencyStop).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(useBotEmergency, botTestContext());
    let first!: Promise<boolean>;
    await act(async () => {
      first = result.current.execute({ kind: 'stop' });
      expect(await result.current.execute({ kind: 'stop' })).toBe(false);
    });
    await waitFor(() => expect(api.emergencyStop).toHaveBeenCalledTimes(1));
    await act(async () => {
      finish({ enabled: false, stopped: 1 });
      expect(await first).toBe(true);
    });
  });

  it('does not retry failed destructive writes; explicit retry is possible', async () => {
    vi.mocked(api.emergencyStop).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(useBotEmergency, botTestContext());
    await act(async () => {
      expect(await result.current.execute({ kind: 'stop' })).toBe(false);
    });
    expect(api.emergencyStop).toHaveBeenCalledTimes(1);
    await act(async () => {
      expect(await result.current.execute({ kind: 'stop' })).toBe(true);
    });
    expect(api.emergencyStop).toHaveBeenCalledTimes(2);
  });

  it('preserves selected scope, and sends no groupIds for the explicit global action', async () => {
    const { result } = renderHook(useBotEmergency, botTestContext());
    await act(async () => {
      expect(await result.current.execute({ kind: 'hide', groupIds: ['c1'] })).toBe(true);
      expect(await result.current.execute({ kind: 'hide' })).toBe(true);
    });
    expect(api.hideBotMessages).toHaveBeenNthCalledWith(1, ['c1']);
    expect(api.hideBotMessages).toHaveBeenNthCalledWith(2, undefined);
    expect(api.emergencyStop).not.toHaveBeenCalled();
  });
});
