import type { AdminMember } from '@opchub/shared/api-domains';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import members from '../../../../messages/vi/members.json';
import { OnboardingCell } from './onboarding-cell';

afterEach(cleanup);

const member = (onboarding: AdminMember['onboarding']): AdminMember => ({
  id: 'm1',
  accountType: 'business',
  fullName: 'Nguyễn Văn An',
  email: 'an.nguyen@mediasoft.vn',
  phone: '+84 912 345 678',
  country: 'vn',
  organization: 'MediaSoft',
  persona: 'Doanh nghiệp',
  status: 'active',
  createdAt: '2026-03-01T17:00:00.000Z',
  groupIds: [],
  business: null,
  onboarding,
});

const show = (m: AdminMember, canRemind = true, onRemind = vi.fn()) => {
  render(
    <NextIntlClientProvider locale="vi" messages={{ members }}>
      <OnboardingCell m={m} canRemind={canRemind} onRemind={onRemind} />
    </NextIntlClientProvider>,
  );
  return onRemind;
};

/** AD-02 cột "Khởi đầu" (V4-611) */
describe('OnboardingCell', () => {
  it('6/8 + tooltip "Còn thiếu: …" + "Nhắc" gọi đúng thành viên', () => {
    const fn = show(member({ done: 6, missing: ['prof', 'aff'], reminded: false }));
    expect(screen.getByText('6/8')).toBeDefined();
    expect(screen.getByTitle('Còn thiếu: Hồ sơ, Affiliate')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Nhắc Nguyễn Văn An/ }));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('đã nhắc trong 24 giờ → "Đã nhắc"; không có members.action → không có nút', () => {
    show(member({ done: 2, missing: ['grp'], reminded: true }));
    expect(screen.getByRole('button').textContent).toBe('Đã nhắc');
    cleanup();
    show(member({ done: 2, missing: ['grp'], reminded: false }), false);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('đủ 8/8: tooltip hoàn tất, không nhắc', () => {
    show(member({ done: 8, missing: [], reminded: false }));
    expect(screen.getByTitle('Đã hoàn tất 8 bước khởi đầu')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
