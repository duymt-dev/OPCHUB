import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { ViewOnlyZone } from './view-only-zone';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@opchub/ui', () => ({ useToast: () => toast }));

afterEach(() => {
  cleanup();
  useAuthStore.getState().setPreview(null);
  vi.clearAllMocks();
});

function mount(showNotice = true) {
  const roleName = 'Kế toán';
  const write = vi.fn();
  const view = vi.fn();
  render(
    <NextIntlClientProvider
      locale="vi"
      messages={{
        common: { rbac: { viewOnly: 'Chỉ xem: {role}', viewOnlyToast: 'Không ghi: {role}' } },
      }}
    >
      <ViewOnlyZone
        readOnly
        role={roleName}
        showNotice={showNotice}
        banner={<span>Xem thử vai trò</span>}
      >
        <button onClick={write}>Lưu thay đổi</button>
        <button onClick={view}>Xem chi tiết</button>
      </ViewOnlyZone>
    </NextIntlClientProvider>,
  );
  return { write, view };
}

describe('TIP-V46-812 read-only preview presentation retains write protection', () => {
  it('shows the actual read-only account notice and blocks writes', () => {
    const { write, view } = mount();
    expect(screen.getByRole('status').textContent).toBe('Chỉ xem: Kế toán');
    fireEvent.click(screen.getByText('Lưu thay đổi'));
    expect(write).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Không ghi: Kế toán');
    fireEvent.click(screen.getByText('Xem chi tiết'));
    expect(view).toHaveBeenCalledOnce();
  });

  it('retains the generic notice during preview by default, as required outside Affiliate', () => {
    useAuthStore
      .getState()
      .setPreview({ roleId: 'lecturer', roleName: 'Giảng viên', permissions: [] });
    const { write } = mount();
    expect(screen.getByRole('status').textContent).toBe('Chỉ xem: Kế toán');
    expect(screen.getByText('Xem thử vai trò')).toBeTruthy();
    fireEvent.click(screen.getByText('Lưu thay đổi'));
    expect(write).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledOnce();
  });

  it('allows explicit domain notice suppression without disabling the write guard', () => {
    useAuthStore
      .getState()
      .setPreview({ roleId: 'accountant', roleName: 'Kế toán', permissions: [] });
    const { write, view } = mount(false);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Xem thử vai trò')).toBeTruthy();
    fireEvent.click(screen.getByText('Lưu thay đổi'));
    expect(write).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Xem chi tiết'));
    expect(view).toHaveBeenCalledOnce();
  });
});
