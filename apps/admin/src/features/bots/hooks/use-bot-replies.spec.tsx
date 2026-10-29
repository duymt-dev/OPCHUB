import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
import { useCan } from '@/lib/permissions';
import * as api from '../reply-api';
import { botKeys } from '../api';
import { botTestContext } from '../tests/context';
import { replyFixture } from '../tests/reply-fixture';
import { useBotReplies } from './use-bot-replies';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../reply-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchBotReplies: vi.fn(),
  patchBotReplies: vi.fn(),
  scanBotReplies: vi.fn(),
  stopBotReplies: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useCan).mockReturnValue(true);
  vi.mocked(api.fetchBotReplies).mockResolvedValue(replyFixture());
  vi.mocked(api.patchBotReplies).mockResolvedValue(replyFixture().settings);
  vi.mocked(api.scanBotReplies).mockResolvedValue({ run: null });
  vi.mocked(api.stopBotReplies).mockResolvedValue({ run: null });
});
afterEach(cleanup);
function mount() {
  const context = botTestContext();
  return { ...renderHook(useBotReplies, context), ...context };
}
it('manual scan works with auto off and invalidates canonical controls and execution', async () => {
  const { result, client } = mount();
  const invalidated = vi.spyOn(client, 'invalidateQueries');
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  act(() => result.current.scan());
  await waitFor(() => expect(api.scanBotReplies).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(result.current.busy).toBe(false));
  for (const key of [api.botReplyKey, botKeys.settings(), botKeys.threads(), botKeys.activity()])
    expect(invalidated).toHaveBeenCalledWith({ queryKey: key });
});
it('prevents duplicate writes, preserves server field errors and allows an explicit retry', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  let reject!: (e: Error) => void;
  vi.mocked(api.patchBotReplies).mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  act(() => {
    result.current.patch({ sampleSize: 201 });
    result.current.scan();
  });
  await waitFor(() => expect(api.patchBotReplies).toHaveBeenCalledTimes(1));
  expect(api.scanBotReplies).not.toHaveBeenCalled();
  expect(result.current.query.data?.settings.sampleSize).toBe(50);
  act(() =>
    reject(
      new ApiError('VALIDATION_ERROR', 400, 'Sai số tin', [
        { path: 'sampleSize', message: 'Tối đa 200' },
      ]),
    ),
  );
  await waitFor(() => expect(result.current.error).toBe('Sai số tin'));
  expect(result.current.fields).toEqual([{ path: 'sampleSize', message: 'Tối đa 200' }]);
  act(() => result.current.patch({ sampleSize: 100 }));
  await waitFor(() => expect(api.patchBotReplies).toHaveBeenLastCalledWith({ sampleSize: 100 }));
});
it('read-only callbacks never issue writes', async () => {
  vi.mocked(useCan).mockReturnValue(false);
  const { result } = mount();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  act(() => {
    result.current.patch({ autoEnabled: true });
    result.current.scan();
    result.current.stop('run1');
  });
  expect(api.patchBotReplies).not.toHaveBeenCalled();
  expect(api.scanBotReplies).not.toHaveBeenCalled();
  expect(api.stopBotReplies).not.toHaveBeenCalled();
});
it('stops the specified run and refreshes actual rather than optimistic progress', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  act(() => result.current.stop('run1'));
  await waitFor(() => expect(api.stopBotReplies).toHaveBeenCalledWith('run1'));
  await waitFor(() => expect(api.fetchBotReplies).toHaveBeenCalledTimes(2));
});
it('surfaces overview failures and retries the read', async () => {
  vi.mocked(api.fetchBotReplies).mockRejectedValueOnce(new Error('offline'));
  const { result } = mount();
  await waitFor(() => expect(result.current.query.isError).toBe(true));
  await act(async () => {
    await result.current.query.refetch();
  });
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
});
