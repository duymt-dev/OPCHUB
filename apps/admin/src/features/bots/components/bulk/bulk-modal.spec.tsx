import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCan } from '@/lib/permissions';
import * as api from '../../bulk-api';
import * as types from '../../conversation-type-api';
import { BULK_ID, bulkFixture, bulkItem, typesPage } from '../../tests/bulk-fixture';
import { botTestContext } from '../../tests/context';
import { BulkModal } from './bulk-modal';
import { installFormBrowser } from '../../tests/form-browser';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../../conversation-type-api', async (original) => ({
  ...(await original<typeof types>()),
  fetchBotConversationTypes: vi.fn(),
}));
vi.mock('../../bulk-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchLatestBotBulk: vi.fn(),
  fetchBotBulkItems: vi.fn(),
  createBotBulk: vi.fn(),
  retryBotBulk: vi.fn(),
  saveBotBulk: vi.fn(),
  selectBotBulkItems: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  installFormBrowser();
  vi.mocked(useCan).mockReturnValue(true);
  vi.mocked(types.fetchBotConversationTypes).mockResolvedValue(typesPage());
  vi.mocked(api.fetchLatestBotBulk).mockResolvedValue({
    batch: bulkFixture({ status: 'done', cursor: 2, selectedCount: 2, savedCount: 1 }),
  });
  vi.mocked(api.fetchBotBulkItems).mockResolvedValue({ items: [bulkItem()], nextCursor: null });
  vi.mocked(api.saveBotBulk).mockResolvedValue({ scriptIds: ['saved'], saved: 1 });
  vi.mocked(api.retryBotBulk).mockResolvedValue(bulkFixture({ cursor: 1 }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const mount = () =>
  render(
    <BulkModal
      groups={[{ id: 'g1', name: 'Nhóm thử' }]}
      personas={[]}
      automaticTopics={[]}
      onClose={vi.fn()}
    />,
    botTestContext(),
  );
it('D-112 recovered ready drafts save only explicitly and count only newly selected items', async () => {
  mount();
  const save = await screen.findByRole('button', { name: 'Lưu 1 kịch bản' });
  expect(api.saveBotBulk).not.toHaveBeenCalled();
  expect(api.createBotBulk).not.toHaveBeenCalled();
  fireEvent.click(save);
  await waitFor(() => expect(api.saveBotBulk).toHaveBeenCalledWith(BULK_ID));
  await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByRole('dialog')).toBeTruthy();
});
it('D-112 partial failed batch retains results, blocks partial save and retries the same batch', async () => {
  vi.mocked(api.fetchLatestBotBulk).mockResolvedValue({
    batch: bulkFixture({ status: 'failed', cursor: 1, selectedCount: 1, error: 'provider' }),
  });
  mount();
  await screen.findByText(/Không gọi được AI/);
  await screen.findByRole('checkbox');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Lưu 1 kịch bản' }).disabled).toBe(
    true,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Thử tạo tiếp' }));
  await waitFor(() => expect(api.retryBotBulk).toHaveBeenCalledWith(BULK_ID));
  expect(api.saveBotBulk).not.toHaveBeenCalled();
});
it('D-112 running recovery prevents duplicate generation and read-only users cannot save', async () => {
  vi.mocked(api.fetchLatestBotBulk).mockResolvedValue({ batch: bulkFixture({ selectedCount: 1 }) });
  vi.mocked(useCan).mockReturnValue(false);
  mount();
  await screen.findByText(/Đang tạo · 0\/2/);
  await screen.findByText(/Bạn chỉ có quyền xem/);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Tạo bằng AI' }).disabled).toBe(
    true,
  );
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Lưu 1 kịch bản' }).disabled).toBe(
    true,
  );
});
