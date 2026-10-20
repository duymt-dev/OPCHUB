import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCan } from '@/lib/permissions';
import * as api from '../api';
import { botTestContext } from '../tests/context';
import { EmergencyBar } from './emergency-bar';

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
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});
afterEach(cleanup);
const mount = (blocked = false) =>
  render(
    <EmergencyBar blocked={blocked} groups={[{ id: 'c1', name: 'Hà Nội' }]} />,
    botTestContext(),
  );
const button = (name: string) => screen.getByRole('button', { name });

describe('REQ-141 Admin destructive confirmations', () => {
  it('opening/cancelling the dialog never calls the endpoint', async () => {
    mount();
    fireEvent.click(button('Tắt khẩn cấp'));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    fireEvent.click(button('Hủy'));
    expect(api.emergencyStop).not.toHaveBeenCalled();
  });

  it('requires nonempty selected groups; never falls back silently to all', async () => {
    mount();
    fireEvent.click(button('Ẩn tin bot'));
    fireEvent.click(await screen.findByLabelText('Nhóm được chọn'));
    expect(button('Xác nhận').hasAttribute('disabled')).toBe(true);
    const select = screen.getByLabelText('Chọn ít nhất một nhóm');
    fireEvent.change(select, { target: { value: 'c1' } });
    fireEvent.click(button('Xác nhận'));
    await waitFor(() => expect(api.hideBotMessages).toHaveBeenCalledWith(['c1']));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps a failed confirmation open and prevents close/duplicate while pending', async () => {
    let fail!: (error: Error) => void;
    vi.mocked(api.emergencyStop).mockReturnValueOnce(
      new Promise((_, reject) => {
        fail = reject;
      }),
    );
    mount();
    fireEvent.click(button('Tắt khẩn cấp'));
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(button('Đang xử lý…').hasAttribute('disabled')).toBe(true));
    expect(button('Hủy').hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
    act(() => {
      fail(new Error('offline'));
    });
    await waitFor(() => expect(button('Xác nhận').hasAttribute('disabled')).toBe(false));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(api.emergencyStop).toHaveBeenCalledTimes(1);
    fireEvent.click(button('Xác nhận'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.emergencyStop).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])(
    'locks writes for view-only or an active settings mutation (%s)',
    (blocked) => {
      vi.mocked(useCan).mockReturnValue(blocked);
      mount(blocked);
      expect(button('Tắt khẩn cấp').hasAttribute('disabled')).toBe(true);
      expect(button('Ẩn tin bot').hasAttribute('disabled')).toBe(true);
    },
  );
});
