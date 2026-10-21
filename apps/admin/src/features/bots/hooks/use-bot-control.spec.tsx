import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { BotSettings } from '@opchub/shared/api-domains';
import { useCan } from '@/lib/permissions';
import * as api from '../api';
import { botTestContext } from '../tests/context';
import { useBotActions } from './use-bot-actions';
import { useBotEmergency } from './use-bot-emergency';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  patchSettings: vi.fn(),
  emergencyStop: vi.fn(),
}));
const initial: BotSettings = {
  enabled: false,
  delayMinutes: 5,
  topics: ['Keep'],
  autoGenerate: false,
  replyToMembers: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCan).mockReturnValue(true);
  vi.mocked(api.emergencyStop).mockResolvedValue({ enabled: false, stopped: 1 });
});
afterEach(cleanup);

describe('REQ-141 settings / emergency ordering', () => {
  it('never enables optimistically, and a failed enable leaves the old state intact', async () => {
    const context = botTestContext();
    context.client.setQueryData(api.botKeys.settings(), initial);
    let reject!: (reason: Error) => void;
    vi.mocked(api.patchSettings).mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const { result } = renderHook(useBotActions, context);
    act(() => result.current.patchSettings({ enabled: true }));
    await waitFor(() => expect(api.patchSettings).toHaveBeenCalledTimes(1));
    expect(context.client.getQueryData(api.botKeys.settings())).toEqual(initial);
    act(() => reject(new Error('offline')));
    await waitFor(() => expect(result.current.settingsBusy).toBe(false));
    expect(context.client.getQueryData(api.botKeys.settings())).toEqual(initial);
  });

  it('a previously started settings write finishes before emergency stop, never re-enabling afterwards', async () => {
    const context = botTestContext();
    context.client.setQueryData(api.botKeys.settings(), initial);
    let resolve!: (settings: BotSettings) => void;
    vi.mocked(api.patchSettings).mockReturnValue(
      new Promise((finish) => {
        resolve = finish;
      }),
    );
    const { result } = renderHook(
      () => ({ actions: useBotActions(), emergency: useBotEmergency() }),
      context,
    );
    act(() => result.current.actions.patchSettings({ enabled: true }));
    await waitFor(() => expect(result.current.actions.settingsBusy).toBe(true));
    let stop!: Promise<boolean>;
    act(() => {
      stop = result.current.emergency.execute({ kind: 'stop' });
    });
    await waitFor(() => expect(result.current.emergency.busy).toBe(true));
    expect(api.emergencyStop).not.toHaveBeenCalled();
    await act(async () => {
      resolve({ ...initial, enabled: true });
      expect(await stop).toBe(true);
    });
    expect(api.emergencyStop).toHaveBeenCalledTimes(1);
    expect(context.client.getQueryData(api.botKeys.settings())).toEqual(initial);
  });

  it('read-only settings callbacks cannot call PATCH', async () => {
    vi.mocked(useCan).mockReturnValue(false);
    const { result } = renderHook(useBotActions, botTestContext());
    act(() => result.current.patchSettings({ enabled: true }));
    await waitFor(() => expect(result.current.settingsBusy).toBe(false));
    expect(api.patchSettings).not.toHaveBeenCalled();
  });
});
