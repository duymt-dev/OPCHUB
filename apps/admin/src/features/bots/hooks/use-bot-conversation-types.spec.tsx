import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
import { useCan } from '@/lib/permissions';
import * as api from '../conversation-type-api';
import { TYPE_ID, typeFixture, typesPage } from '../tests/bulk-fixture';
import { botTestContext } from '../tests/context';
import { useBotConversationTypes } from './use-bot-conversation-types';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../conversation-type-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchBotConversationTypes: vi.fn(),
  createBotConversationType: vi.fn(),
  deleteBotConversationType: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useCan).mockReturnValue(true);
  vi.mocked(api.fetchBotConversationTypes).mockResolvedValue(typesPage());
  vi.mocked(api.createBotConversationType).mockResolvedValue(typeFixture());
  vi.mocked(api.deleteBotConversationType).mockResolvedValue({ id: TYPE_ID });
});
afterEach(cleanup);
function mount() {
  const context = botTestContext();
  return { ...renderHook(useBotConversationTypes, context), ...context };
}
it('D-112 merges bounded custom pages but renders the four immutable builtins only once', async () => {
  vi.mocked(api.fetchBotConversationTypes).mockImplementation((after) =>
    Promise.resolve(
      after ? { ...typesPage(), items: [typeFixture()] } : { ...typesPage(), nextCursor: TYPE_ID },
    ),
  );
  const { result } = mount();
  await waitFor(() => expect(result.current.types).toHaveLength(4));
  await act(async () => {
    await result.current.query.fetchNextPage();
  });
  expect(api.fetchBotConversationTypes).toHaveBeenLastCalledWith(TYPE_ID);
  await waitFor(() => expect(result.current.types).toHaveLength(5));
  expect(result.current.query.hasNextPage).toBe(false);
});
it('D-112 returns the actual newly-created type and refreshes canonical definitions', async () => {
  const { result, client } = mount();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  await act(async () => {
    expect(await result.current.create({ name: 'Kết nối', description: 'Trao đổi' })).toEqual({
      ok: true,
      value: typeFixture(),
    });
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: api.botConversationTypesKey });
  await act(async () => {
    expect(await result.current.remove(TYPE_ID)).toEqual({ ok: true, value: null });
  });
  expect(api.deleteBotConversationType).toHaveBeenCalledWith(TYPE_ID);
});
it('D-112 serializes definition writes, retains field errors and does not retry implicitly', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  let reject!: (error: Error) => void;
  vi.mocked(api.createBotConversationType).mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  act(() => {
    void result.current.create({ name: 'Same', description: '' });
    void result.current.remove(TYPE_ID);
  });
  await waitFor(() => expect(api.createBotConversationType).toHaveBeenCalledTimes(1));
  expect(api.deleteBotConversationType).not.toHaveBeenCalled();
  const error = new ApiError('CONFLICT', 409, 'Exists', [{ path: 'name', message: 'Duplicate' }]);
  act(() => reject(error));
  await waitFor(() => expect(result.current.error).toBe(error));
  expect(api.createBotConversationType).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.create({ name: 'Different', description: '' });
  });
  expect(api.createBotConversationType).toHaveBeenCalledTimes(2);
});
it('D-112 definition callbacks are read-only without bots.action', async () => {
  vi.mocked(useCan).mockReturnValue(false);
  const { result } = mount();
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  await act(async () => {
    expect(await result.current.create({ name: 'Denied', description: '' })).toEqual({ ok: false });
    expect(await result.current.remove(TYPE_ID)).toEqual({ ok: false });
  });
  expect(api.createBotConversationType).not.toHaveBeenCalled();
  expect(api.deleteBotConversationType).not.toHaveBeenCalled();
});
