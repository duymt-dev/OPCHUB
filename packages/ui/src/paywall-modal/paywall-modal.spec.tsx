import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaywallModal } from './paywall-modal';
import { fitScale } from './use-fit-scale';

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

describe('fitScale (popup V4 §23.5)', () => {
  it('REQ-391 chế độ fit không cuộn: thu nhỏ để cao vừa 95% màn 1366×768', () => {
    // Nội dung tỉ lệ nghịch với chiều rộng: 1240px rộng → cao 1100px
    const heightAt = (w: number) => (1240 * 1100) / w;
    const r = fitScale(1366, 768, heightAt);
    expect(r.scale).toBeLessThan(1);
    expect(r.scale * heightAt(r.width)).toBeLessThanOrEqual(768 * 0.95 + 1);
    expect(r.width * r.scale).toBeCloseTo(Math.min(1366 * 0.95, 1440), 0);
  });

  it('REQ-391 nội dung đã vừa → giữ tỉ lệ 1', () => {
    expect(fitScale(1920, 1080, () => 600)).toEqual({ width: 1440, scale: 1 });
  });
});

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
