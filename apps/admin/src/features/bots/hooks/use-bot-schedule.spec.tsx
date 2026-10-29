import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { botScheduleSchema, type BotSettings } from '@opchub/shared/api-domains';
import { ApiError } from '@/lib/api-client';
import { useCan } from '@/lib/permissions';
import * as api from '../schedule-api';
import * as catalog from '../api';
import { botTestContext } from '../tests/context';
import { useBotSchedule } from './use-bot-schedule';
import { useBotEmergency } from './use-bot-emergency';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../schedule-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchBotSchedule: vi.fn(),
  patchBotSchedule: vi.fn(),
}));
vi.mock('../api', async (original) => ({
  ...(await original<typeof catalog>()),
  patchSettings: vi.fn(),
  emergencyStop: vi.fn(),
}));
const settings: BotSettings = {
  enabled: true,
  autoGenerate: true,
  replyToMembers: true,
  topics: [],
  delayMinutes: 5,
};
let stored: Awaited<ReturnType<typeof api.fetchBotSchedule>>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useCan).mockReturnValue(true);
  stored = { schedule: { paused: false, fromDate: null, toDate: null }, state: 'live' };
  vi.mocked(api.fetchBotSchedule).mockImplementation(() => Promise.resolve(stored));
  vi.mocked(api.patchBotSchedule).mockImplementation((patch) => {
    stored = {
      schedule: botScheduleSchema.parse({ ...stored.schedule, ...patch }),
      state: patch.paused ? 'paused' : 'live',
    };
    return Promise.resolve(stored);
  });
  vi.mocked(catalog.patchSettings).mockImplementation((patch) =>
    Promise.resolve({ ...settings, ...patch }),
  );
  vi.mocked(catalog.emergencyStop).mockResolvedValue({ enabled: false, stopped: 1 });
});
afterEach(cleanup);
function mount(enabled = true) {
  const context = botTestContext();
  const initial = { ...settings, enabled };
  context.client.setQueryData(catalog.botKeys.settings(), initial);
  const rendered = renderHook(
    () => ({ control: useBotSchedule(initial), emergency: useBotEmergency() }),
    context,
  );
  return { ...rendered, ...context };
}
it('normal pause changes schedule only, retaining the global enabled setting', async () => {
  const { result, client } = mount();
  await waitFor(() => expect(result.current.control.query.isSuccess).toBe(true));
  act(() => result.current.control.toggle());
  await waitFor(() => expect(result.current.control.query.data?.schedule.paused).toBe(true));
  expect(api.patchBotSchedule).toHaveBeenCalledWith({ paused: true });
  expect(catalog.patchSettings).not.toHaveBeenCalled();
  expect(client.getQueryData(catalog.botKeys.settings())).toEqual(settings);
});
it('does not optimistically resume or duplicate writes and preserves server field errors', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.control.query.isSuccess).toBe(true));
  let reject!: (error: Error) => void;
  vi.mocked(api.patchBotSchedule).mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  act(() => {
    result.current.control.patch({ toDate: '2026-10-20' });
    result.current.control.toggle();
  });
  await waitFor(() => expect(api.patchBotSchedule).toHaveBeenCalledTimes(1));
  expect(result.current.control.query.data?.schedule.toDate).toBeNull();
  act(() =>
    reject(
      new ApiError('VALIDATION_ERROR', 400, 'Invalid schedule', [
        { path: 'toDate', message: 'Invalid date range' },
      ]),
    ),
  );
  await waitFor(() => expect(result.current.control.error).toBe('Invalid schedule'));
  expect(result.current.control.fields).toEqual([
    { path: 'toDate', message: 'Invalid date range' },
  ]);
});
it('explicit emergency resume clears pause before enabling; failure cannot enable', async () => {
  const { result, client } = mount(false);
  await waitFor(() => expect(result.current.control.query.isSuccess).toBe(true));
  vi.mocked(api.patchBotSchedule).mockRejectedValueOnce(new Error('offline'));
  act(() => result.current.control.toggle());
  await waitFor(() => expect(result.current.control.error).toBeTruthy());
  expect(catalog.patchSettings).not.toHaveBeenCalled();
  expect(client.getQueryData(catalog.botKeys.settings())).toMatchObject({ enabled: false });
  act(() => result.current.control.toggle());
  await waitFor(() => expect(catalog.patchSettings).toHaveBeenCalledWith({ enabled: true }));
  expect(api.patchBotSchedule).toHaveBeenLastCalledWith({ paused: false });
});
it('serializes emergency stop after an in-flight resume so nothing re-enables afterwards', async () => {
  const { result, client } = mount(false);
  await waitFor(() => expect(result.current.control.query.isSuccess).toBe(true));
  let release!: (value: typeof stored) => void;
  vi.mocked(api.patchBotSchedule).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  act(() => result.current.control.toggle());
  await waitFor(() => expect(api.patchBotSchedule).toHaveBeenCalledTimes(1));
  let stopping!: Promise<boolean>;
  act(() => {
    stopping = result.current.emergency.execute({ kind: 'stop' });
  });
  expect(catalog.emergencyStop).not.toHaveBeenCalled();
  await act(async () => {
    release(stored);
    await stopping;
  });
  expect(catalog.patchSettings).toHaveBeenCalledTimes(1);
  expect(catalog.emergencyStop).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(catalog.botKeys.settings())).toMatchObject({ enabled: false });
});
it('read-only callbacks cannot write either schedule or settings', async () => {
  vi.mocked(useCan).mockReturnValue(false);
  const { result } = mount();
  await waitFor(() => expect(result.current.control.query.isSuccess).toBe(true));
  act(() => {
    result.current.control.toggle();
    result.current.control.patch({ paused: true });
  });
  expect(api.patchBotSchedule).not.toHaveBeenCalled();
  expect(catalog.patchSettings).not.toHaveBeenCalled();
});
