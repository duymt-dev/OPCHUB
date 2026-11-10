import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as Ui from '@opchub/ui';
import { mockAdminMeOf } from '@opchub/shared/mock-domains';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import common from '../../../messages/vi/common.json';
import { AdminProfileScreen } from './components/admin-profile-screen';
import * as api from './api';

const state = vi.hoisted(() => ({ toast: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<typeof Ui>()),
  useToast: () => state.toast,
}));
vi.mock('./api', () => ({ updateProfile: vi.fn(), changePassword: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  const me = mockAdminMeOf('admin');
  if (!me) throw new Error('missing admin fixture');
  useAuthStore.getState().setSession('old', me);
});
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
});
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <NextIntlClientProvider locale="vi" messages={{ common }}>
        <AdminProfileScreen />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}
it('TIP-V46-822 AC-01/02 readonly email/role and successful name updates store immediately', async () => {
  const me = useAuthStore.getState().me;
  if (!me) throw new Error('missing session');
  vi.mocked(api.updateProfile).mockResolvedValue({ ...me, name: 'Trần Quản Trị', phone: null });
  mount();
  expect(screen.getByLabelText('Email đăng nhập').hasAttribute('disabled')).toBe(true);
  expect(screen.getByText('Super Admin')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Trần Quản Trị' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));
  await waitFor(() => expect(useAuthStore.getState().me?.name).toBe('Trần Quản Trị'));
  expect(state.toast).toHaveBeenCalledWith('Đã lưu thông tin cá nhân');
});
it('TIP-V46-822 AC-04 successful password clears fields and replaces in-memory token', async () => {
  const admin = useAuthStore.getState().me;
  if (!admin) throw new Error('missing session');
  vi.mocked(api.changePassword).mockResolvedValue({ accessToken: 'new-session', admin });
  mount();
  for (const [label, value] of [
    ['Mật khẩu hiện tại', 'Admin@2026'],
    ['Mật khẩu mới', 'NewPass1'],
    ['Xác nhận mật khẩu mới', 'NewPass1'],
  ]) {
    fireEvent.change(screen.getByLabelText(label ?? ''), { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
  await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('new-session'));
  expect(screen.getByLabelText<HTMLInputElement>('Mật khẩu hiện tại').value).toBe('');
  expect(state.toast).toHaveBeenCalledWith('Đã cập nhật mật khẩu');
});
it('TIP-V46-822 AC-05 backend current-password error stays at current field, session intact', async () => {
  vi.mocked(api.changePassword).mockRejectedValue(
    new ApiError('VALIDATION_ERROR', 400, 'Sai mật khẩu', [
      { path: 'currentPassword', message: 'Mật khẩu hiện tại không đúng' },
    ]),
  );
  mount();
  for (const label of ['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới']) {
    fireEvent.change(screen.getByLabelText(label), {
      target: { value: label === 'Mật khẩu hiện tại' ? 'WrongPass1' : 'NewPass1' },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
  await waitFor(() => expect(screen.getByText('Mật khẩu hiện tại không đúng')).toBeTruthy());
  expect(useAuthStore.getState().accessToken).toBe('old');
});

it('TIP-V46-822 AC-03 rejected avatar has visible feedback rather than hidden field help', async () => {
  vi.mocked(api.updateProfile).mockRejectedValue(
    new ApiError('VALIDATION_ERROR', 400, 'Ảnh chưa được tải lên', [
      { path: 'avatarUrl', message: 'Ảnh chưa được tải lên' },
    ]),
  );
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));
  await waitFor(() => expect(state.toast).toHaveBeenCalledWith('Ảnh chưa được tải lên'));
  expect(useAuthStore.getState().accessToken).toBe('old');
});
