import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGrants } from '@/lib/permissions';
import type { AffiliateDetail } from '../types';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { AffiliateDetailHead } from './affiliate-detail-head';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action'],
    roleName: 'Viewer',
    previewing: false,
  });
});
afterEach(cleanup);

const agent: AffiliateDetail = {
  id: 'a3',
  userId: 'ha',
  name: 'Lê Thu Hà',
  email: 'ha.le@opcmedia.vn',
  code: 'HAOPC',
  rate: 25,
  status: 'active',
  source: 'auto',
  customers: 13,
  revenue: 7800000,
  balance: 750000,
  paid: 1200000,
  monthStatus: 'recorded',
  hasBank: true,
  bank: { bankHolder: 'LE THU HA', bankName: 'ACB', bankNo: '24681357' },
  stats: { customers: 13, revenue: 7800000, commission: 1950000, paid: 1200000 },
};

describe('REQ-312 Affiliate detail follows prototype information order', () => {
  it('renders actual non-default attribution days and follows a policy change', () => {
    const { rerender } = render(
      <AffiliateDetailHead agent={agent} cookieDays={45} />,
      affiliateTestContext(),
    );
    expect(screen.getByText(/Ghi nhận link 45 ngày/)).toBeTruthy();
    expect(screen.queryByText(/Ghi nhận link 30 ngày/)).toBeNull();
    rerender(<AffiliateDetailHead agent={agent} cookieDays={17} />);
    expect(screen.getByText(/Ghi nhận link 17 ngày/)).toBeTruthy();
    expect(screen.queryByText(/Ghi nhận link 45 ngày/)).toBeNull();
  });

  it('omits unavailable policy metadata rather than fabricating a default', () => {
    render(<AffiliateDetailHead agent={agent} />, affiliateTestContext());
    expect(screen.queryByText(/Ghi nhận link \d+ ngày/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Lê Thu Hà' })).toBeTruthy();
    expect(screen.getByText('LE THU HA · ACB · 24681357')).toBeTruthy();
  });
  it('shows identity/bank, then server-owned statistics before the rate editor', () => {
    render(<AffiliateDetailHead agent={agent} />, affiliateTestContext());
    const name = screen.getByRole('heading', { name: 'Lê Thu Hà' });
    const bank = screen.getByText('LE THU HA · ACB · 24681357');
    const stats = screen.getByText('1.950.000đ');
    const edit = screen.getByRole('button', { name: 'Sửa (Admin)' });
    expect(name.compareDocumentPosition(bank) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(bank.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(stats.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByRole('link', { name: /Quay lại danh sách/ }).getAttribute('href')).toBe(
      '/affiliate?tab=aff',
    );
  });

  it('keeps missing bank and paused warnings visible instead of disguising them for parity', () => {
    render(
      <AffiliateDetailHead agent={{ ...agent, bank: null, hasBank: false, status: 'paused' }} />,
      affiliateTestContext(),
    );
    expect(screen.getByText('Chưa có số tài khoản')).toBeTruthy();
    expect(screen.getByText('Tạm dừng')).toBeTruthy();
    expect(screen.queryByText('LE THU HA · ACB · 24681357')).toBeNull();
  });

  it('preserves read-only permission checks after converting the editor button to link style', () => {
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Viewer',
      previewing: false,
    });
    render(<AffiliateDetailHead agent={agent} />, affiliateTestContext());
    fireEvent.click(screen.getByRole('button', { name: 'Sửa (Admin)' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('chỉ có quyền xem');
  });

  it('opens the inline editor with the actual assigned rate rather than a modal', () => {
    render(<AffiliateDetailHead agent={agent} />, affiliateTestContext());
    fireEvent.click(screen.getByRole('button', { name: 'Sửa (Admin)' }));
    expect(screen.getByRole('form', { name: /^Đặt tỷ lệ hoa hồng$/ })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Tỷ lệ hoa hồng (%)' }).value,
    ).toBe('25');
  });
});
