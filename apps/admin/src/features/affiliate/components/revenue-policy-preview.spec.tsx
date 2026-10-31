import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import type { PriceConfig } from '@opchub/shared';
import { affiliateTestContext } from '../tests/context';
import { RevenuePolicyPreview } from './revenue-policy-preview';

const pricesQuery = vi.hoisted(() =>
  vi.fn<() => { data: PriceConfig | undefined; isError: boolean; refetch: () => void }>(),
);
vi.mock('@/lib/use-prices', () => ({ usePricesQuery: pricesQuery }));
const priceState = { data: PRICE_DEFAULTS, isError: false, refetch: vi.fn() };
const policy = { yearOneRate: 50, annualDecrease: 10, minimumRate: 20 };
beforeEach(() => {
  vi.clearAllMocks();
  pricesQuery.mockReturnValue(priceState);
});
afterEach(cleanup);
describe('REQ-617 sharing policy matrices', () => {
  it('shows all three price-config plans, split amounts and accessible scroll regions', () => {
    render(<RevenuePolicyPreview values={policy} />, affiliateTestContext());
    const plans = screen.getByRole('region', { name: 'Phần GĐ Vùng theo từng gói' });
    const rows = within(plans).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]?.textContent).toContain('1.200.000đ / năm');
    expect(rows[1]?.textContent).toContain('600.000đMS 600.000đ');
    expect(rows[2]?.textContent).toContain('1.800.000đMS 1.800.000đ');
    expect(rows[3]?.textContent).toContain('15.000.000đ / dự án');
    expect(rows[3]?.textContent).toContain('3.000.000đMS 12.000.000đ');
    expect(plans.tabIndex).toBe(0);
    expect(screen.getByRole('region', { name: 'Tỷ lệ chia sẻ theo năm của khách' }).tabIndex).toBe(
      0,
    );
  });
  it('updates arbitrary draft policy and price configuration without a save mutation', () => {
    const view = render(<RevenuePolicyPreview values={policy} />, affiliateTestContext());
    pricesQuery.mockReturnValue({
      ...priceState,
      data: {
        ...PRICE_DEFAULTS,
        per: { ...PRICE_DEFAULTS.per, y: 101 },
      },
    });
    view.rerender(
      <RevenuePolicyPreview values={{ yearOneRate: 63, annualDecrease: 7, minimumRate: 21 }} />,
    );
    const plans = screen.getByRole('region', { name: 'Phần GĐ Vùng theo từng gói' });
    expect(within(plans).getByRole('columnheader', { name: 'Từ năm 7' })).toBeDefined();
    expect(within(plans).getAllByRole('row')[1]?.textContent).toContain('64đMS 37đ');
    expect(priceState.refetch).not.toHaveBeenCalled();
  });
  it('invalid draft replaces misleading examples with visible feedback', () => {
    render(
      <RevenuePolicyPreview values={{ ...policy, minimumRate: 60 }} />,
      affiliateTestContext(),
    );
    expect(screen.getByRole('status').textContent).toContain('Hoàn thiện tỷ lệ chia sẻ');
    expect(screen.queryByRole('table')).toBeNull();
  });
  it('loading and failed prices never become zero/hardcoded example amounts, and retry is available', () => {
    pricesQuery.mockReturnValue({ ...priceState, data: undefined });
    const view = render(<RevenuePolicyPreview values={policy} />, affiliateTestContext());
    expect(screen.getByRole('status').textContent).toContain('Đang tải');
    expect(screen.queryByText('600.000đ')).toBeNull();
    pricesQuery.mockReturnValue({
      ...priceState,
      data: undefined,
      isError: true,
    });
    view.rerender(<RevenuePolicyPreview values={policy} />);
    expect(screen.getByText('Không tải được cấu hình bảng giá')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(priceState.refetch).toHaveBeenCalledTimes(1);
  });
});
