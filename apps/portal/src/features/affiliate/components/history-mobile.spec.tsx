import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import affiliate from '../../../../messages/vi/affiliate.json';
import { PayoutCards, ReferralCards } from './history-mobile';

afterEach(cleanup);
describe('Affiliate mobile history', () => {
  it('REQ-311 thẻ khách giữ tên đã che từ API, trạng thái và lý do hủy', () => {
    render(
      <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
        <ReferralCards
          rows={[
            {
              id: 'r1',
              name: 'Đỗ Minh T.',
              plan: 'Phí thành viên 12 tháng',
              date: '2026-10-17T02:00:00Z',
              feeAmount: 600000,
              commission: 120000,
              rate: 20,
              status: 'cancelled',
              cancelReason: 'Vi phạm chính sách',
            },
          ]}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Đỗ Minh T.')).toBeDefined();
    expect(screen.queryByText('Đỗ Minh Tuấn')).toBeNull();
    expect(screen.getByText('Đã hủy')).toBeDefined();
    expect(screen.getByText('Vi phạm chính sách')).toBeDefined();
    expect(screen.getByText('600.000đ')).toBeDefined();
  });
  it('REQ-311 thẻ lịch sử dùng snapshot ngân hàng lúc chi, không lấy tài khoản hiện tại', () => {
    render(
      <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
        <PayoutCards
          rows={[
            {
              monthKey: '2026-09',
              amount: 480000,
              count: 4,
              paidAt: '2026-09-30T02:00:00Z',
              bank: { bankName: 'ACB', bankNo: '123456789', bankHolder: 'NGUYEN VAN AN' },
            },
          ]}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Tháng 09/2026')).toBeDefined();
    expect(screen.getByText('480.000đ')).toBeDefined();
    expect(screen.getByText('ACB · 123456789')).toBeDefined();
    expect(screen.getByText('Đã chuyển khoản')).toBeDefined();
  });
});
