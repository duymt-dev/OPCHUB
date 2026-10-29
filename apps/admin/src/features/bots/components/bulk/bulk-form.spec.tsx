import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
import * as api from '../../conversation-type-api';
import { typesPage } from '../../tests/bulk-fixture';
import { botTestContext } from '../../tests/context';
import { BulkForm } from './bulk-form';
import { installFormBrowser } from '../../tests/form-browser';

vi.mock('@/lib/permissions', () => ({ useCan: () => true }));
vi.mock('../../conversation-type-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchBotConversationTypes: vi.fn(),
}));
beforeEach(() => {
  installFormBrowser();
  vi.mocked(api.fetchBotConversationTypes).mockResolvedValue(typesPage());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(disabled = false, error: Error | null = null) {
  const create = vi.fn().mockResolvedValue(true);
  const props = {
    groups: [{ id: 'g1', name: 'Nhóm thử' }],
    automaticTopics: ['AI', 'Kế toán'],
    disabled,
    error,
    create,
  };
  return { ...render(<BulkForm {...props} />, botTestContext()), create, props };
}
it('D-112 validates missing fields then submits normalized topics, selected type/groups and exact defaults', async () => {
  const { create } = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo bằng AI' }));
  await screen.findByText(/Nhập 1–100 chủ đề/);
  expect(create).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Danh sách chủ đề (mỗi dòng 1 chủ đề)'), {
    target: { value: ' AI\nai\nB ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Nhóm thử' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Thảo luận/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Tạo bằng AI' }));
  await waitFor(() =>
    expect(create).toHaveBeenCalledWith({
      topics: ['AI', 'B'],
      typeId: 'builtin-discussion',
      perTopic: 2,
      turns: 4,
      delayMinutes: 5,
      groupIds: ['g1'],
    }),
  );
});
it('D-112 automatic topics and select-all populate the form without generating or saving', async () => {
  const { create } = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Dùng chủ đề tự động' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chọn tất cả' }));
  expect(
    screen.getByLabelText<HTMLTextAreaElement>('Danh sách chủ đề (mỗi dòng 1 chủ đề)').value,
  ).toBe('AI\nKế toán');
  expect(screen.getByRole('button', { name: 'Nhóm thử' }).getAttribute('aria-pressed')).toBe(
    'true',
  );
  await screen.findByText('2 chủ đề × 2 kịch bản = 4 kịch bản');
  expect(create).not.toHaveBeenCalled();
});
it('D-112 transport field errors remain next to the mapped input and disabled form blocks submission', async () => {
  mount(
    true,
    new ApiError('VALIDATION_ERROR', 400, 'Invalid', [
      { path: 'topics.0', message: 'Chủ đề không hợp lệ' },
    ]),
  );
  await screen.findByText('Chủ đề không hợp lệ');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Tạo bằng AI' }).disabled).toBe(
    true,
  );
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Chọn tất cả' }).disabled).toBe(
    true,
  );
});
