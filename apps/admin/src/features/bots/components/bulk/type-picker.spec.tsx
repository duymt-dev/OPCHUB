import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
import { useCan } from '@/lib/permissions';
import * as api from '../../conversation-type-api';
import { TYPE_ID, typeFixture, typesPage } from '../../tests/bulk-fixture';
import { botTestContext } from '../../tests/context';
import { TypePicker } from './type-picker';
import { installFormBrowser } from '../../tests/form-browser';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../../conversation-type-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchBotConversationTypes: vi.fn(),
  createBotConversationType: vi.fn(),
  deleteBotConversationType: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  installFormBrowser();
  vi.mocked(useCan).mockReturnValue(true);
  vi.mocked(api.fetchBotConversationTypes).mockResolvedValue(typesPage());
  vi.mocked(api.createBotConversationType).mockResolvedValue(typeFixture());
  vi.mocked(api.deleteBotConversationType).mockResolvedValue({ id: TYPE_ID });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('D-112 builtins cannot be deleted and a confirmed new type beyond the loaded page is visible/selectable', async () => {
  const onChange = vi.fn();
  render(<TypePicker value="builtin-qa" onChange={onChange} />, botTestContext());
  await screen.findByRole('button', { name: /^Hỏi đáp/ });
  expect(screen.queryByRole('button', { name: /^Xóa loại/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm loại hội thoại' }));
  fireEvent.change(screen.getByLabelText('Tên loại hội thoại'), { target: { value: 'Kết nối' } });
  fireEvent.change(screen.getByLabelText('Định nghĩa hội thoại'), {
    target: { value: 'Trao đổi' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(TYPE_ID));
  await screen.findByRole('button', { name: 'Kết nối' });
  expect(api.createBotConversationType).toHaveBeenCalledWith({
    name: 'Kết nối',
    description: 'Trao đổi',
  });
});
it('D-112 custom delete needs confirmation and failures leave the dialog open for an explicit retry', async () => {
  vi.mocked(api.fetchBotConversationTypes).mockResolvedValue({
    ...typesPage(),
    items: [typeFixture()],
  });
  vi.mocked(api.deleteBotConversationType).mockRejectedValueOnce(
    new ApiError('CONFLICT', 409, 'Chưa xóa được', []),
  );
  const onChange = vi.fn();
  render(<TypePicker value={TYPE_ID} onChange={onChange} />, botTestContext());
  fireEvent.click(await screen.findByRole('button', { name: 'Xóa loại Kết nối' }));
  expect(api.deleteBotConversationType).not.toHaveBeenCalled();
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa loại hội thoại' }));
  await within(dialog).findByText('Chưa xóa được');
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa loại hội thoại' }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith('builtin-qa'));
  expect(api.deleteBotConversationType).toHaveBeenCalledTimes(2);
});
it('D-112 read-only catalog keeps definitions visible while disabling create/delete/select', async () => {
  vi.mocked(useCan).mockReturnValue(false);
  vi.mocked(api.fetchBotConversationTypes).mockResolvedValue({
    ...typesPage(),
    items: [typeFixture()],
  });
  render(<TypePicker value={TYPE_ID} />, botTestContext());
  await screen.findByRole('button', { name: 'Kết nối' });
  for (const name of ['+ Thêm loại hội thoại', 'Xóa loại Kết nối', 'Kết nối'])
    expect(screen.getByRole<HTMLButtonElement>('button', { name }).disabled).toBe(true);
});
