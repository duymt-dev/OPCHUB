import type { Onboarding } from '@opchub/shared/api-domains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import onboarding from '../../../../messages/vi/onboarding.json';
import { OnboardingCard } from './onboarding-card';

const push = vi.fn<(href: string) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const openInPlace = vi.fn<(href: string) => boolean>();
const openPricingPopup = vi.fn<() => void>();
vi.mock('@/features/membership', () => ({
  formatVnd: (n: number) => `${n.toLocaleString('vi-VN')}đ`,
  openInPlace: (h: string) => openInPlace(h),
  openPricingPopup: () => openPricingPopup(),
  PAYWALL_PATHS: { pay: '/membership/pay' },
}));

afterEach(() => {
  cleanup();
  push.mockReset();
  openInPlace.mockReset();
  openPricingPopup.mockReset();
});

const BIZ = ['pay', 'prof', 'grp', 'chat', 'st', 'nd', 'aff', 'ev'] as const;
const PER = ['pay', 'prof', 'grp', 'chat', 'pj', 'ex', 'aff', 'ev'] as const;

function make(
  done: readonly boolean[],
  paid = true,
  type: 'business' | 'personal' = 'business',
  fundraising: Onboarding['fundraising'] = null,
): Onboarding {
  const keys = type === 'business' ? BIZ : PER;
  const steps = keys.map((key, i) => ({
    key,
    done: !!done[i],
    locked: key !== 'pay' && !paid,
  }));
  return {
    accountType: type,
    paid,
    done: steps.filter((s) => s.done).length,
    total: 8,
    steps,
    fundraising,
  };
}

const show = (o: Onboarding) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="vi" messages={{ onboarding }} timeZone="Asia/Ho_Chi_Minh">
        <OnboardingCard o={o} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );

const row = (key: string) => document.querySelector(`[data-step="${key}"]`);

/** UP-04 thẻ "Hướng dẫn bắt đầu" (V4-611): tiến độ, bước kế tiếp, khoá, tuỳ chọn Gọi vốn */
describe('OnboardingCard', () => {
  it('M1 6/8 · 75%: bước kế tiếp tô xanh, bước xong "Đã hoàn thành", CTA đi đúng màn', () => {
    show(make([true, false, true, true, true, true, false, true]));
    expect(screen.getByText('Đã xong 6/8 bước · 75%')).toBeDefined();
    expect(row('prof')?.getAttribute('data-state')).toBe('next');
    expect(row('aff')?.getAttribute('data-state')).toBe('todo');
    expect(screen.getAllByText('Đã hoàn thành')).toHaveLength(6);
    expect(screen.getByText('Hoàn thiện hồ sơ doanh nghiệp')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật' }));
    expect(push).toHaveBeenLastCalledWith('/profile');
    fireEvent.click(screen.getByRole('button', { name: 'Lấy link' }));
    expect(push).toHaveBeenLastCalledWith('/affiliate');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('chưa đóng phí: bước 2–8 "Cần thanh toán phí" → hộp chuyển khoản', () => {
    show(make([], false));
    expect(screen.getAllByRole('button', { name: 'Cần thanh toán phí' })).toHaveLength(7);
    expect(
      screen.getByText('Webinar, meetup, đào tạo OPC · mở sau khi thanh toán phí'),
    ).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cần thanh toán phí' })[0]!);
    expect(openInPlace).toHaveBeenLastCalledWith('/membership/pay');
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
    expect(openInPlace).toHaveBeenCalledTimes(2);
  });

  it('Cá nhân có dự án: thẻ tuỳ chọn Gọi vốn "Xem gói" → Bảng giá; xong → "Đã đăng ký"', () => {
    show(make([true], true, 'personal', { done: false }));
    expect(screen.getByText('Gói Gọi vốn cho dự án (tùy chọn)')).toBeDefined();
    expect(screen.getByText(/15\.000\.000đ\/dự án\/6 tháng/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Xem gói' }));
    expect(openPricingPopup).toHaveBeenCalledOnce();
    cleanup();
    show(make([true], true, 'personal', { done: true }));
    expect(screen.getByText('Đã đăng ký')).toBeDefined();
  });

  it('đủ 8/8: dải xanh chúc mừng, không còn nút', () => {
    show(make(Array.from({ length: 8 }, () => true)));
    expect(screen.getByText('Đã xong 8/8 bước · 100%')).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain(
      'Bạn đã hoàn thành tất cả các bước khởi đầu',
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
