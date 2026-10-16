import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaywallModal } from './paywall-modal';

const labels = { close: 'Đóng', mustPay: 'Cần thanh toán để tiếp tục', logout: 'Đăng xuất' };

function setup(mandatory: boolean) {
  const fns = { onClose: vi.fn(), onLogout: vi.fn(), onBlocked: vi.fn() };
  render(
    <PaywallModal open mandatory={mandatory} title="Gói dịch vụ" wide labels={labels} {...fns}>
      <button type="button">Tư vấn</button>
    </PaywallModal>,
  );
  return fns;
}

describe('PaywallModal', () => {
  it('bắt buộc: không có ×, Esc chỉ báo chặn, vẫn bấm được nội dung + Đăng xuất', () => {
    const fns = setup(true);
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
    expect(screen.getByText('Cần thanh toán để tiếp tục')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fns.onBlocked).toHaveBeenCalledTimes(1);
    expect(fns.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(fns.onLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Tư vấn' })).toBeTruthy();
  });

  it('tuỳ chọn: × và Esc đóng hộp', () => {
    const fns = setup(false);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fns.onClose).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).toBeNull();
  });
});
