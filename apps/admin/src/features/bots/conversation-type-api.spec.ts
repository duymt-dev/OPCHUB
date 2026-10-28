import { api } from '@/lib/api-client';
import * as types from './conversation-type-api';
import { TYPE_ID } from './tests/bulk-fixture';

vi.mock('@/lib/api-client', () => ({ api: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it('D-112 type catalog uses bounded UUID keyset pages', async () => {
  await types.fetchBotConversationTypes();
  await types.fetchBotConversationTypes(TYPE_ID);
  expect(api).toHaveBeenNthCalledWith(
    1,
    '/admin/bot/conversation-types?limit=50',
    expect.any(Object),
  );
  expect(api).toHaveBeenNthCalledWith(
    2,
    `/admin/bot/conversation-types?limit=50&after=${TYPE_ID}`,
    expect.any(Object),
  );
  expect(() => types.fetchBotConversationTypes('bad')).toThrow();
  expect(api).toHaveBeenCalledTimes(2);
});
it('D-112 validates custom type writes and encodes identifiers without path injection', async () => {
  await types.createBotConversationType({ name: ' Name ', description: ' Definition ' });
  await types.deleteBotConversationType('custom/id');
  expect(api).toHaveBeenNthCalledWith(
    1,
    '/admin/bot/conversation-types',
    expect.objectContaining({
      method: 'POST',
      body: { name: 'Name', description: 'Definition' },
    }),
  );
  expect(api).toHaveBeenNthCalledWith(
    2,
    '/admin/bot/conversation-types/custom%2Fid',
    expect.objectContaining({ method: 'DELETE' }),
  );
  expect(() => types.createBotConversationType({ name: ' ', description: '' })).toThrow();
  expect(api).toHaveBeenCalledTimes(2);
});
