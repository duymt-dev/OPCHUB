import ui from '../../../../messages/vi/ui.json';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import type { AdminOverview } from '@opchub/shared/api-domains';
import type * as Ui from '@opchub/ui';
import type { DateRangePickerProps } from '@opchub/ui';
import { mockOverview } from '@opchub/shared/mock-domains';
import overview from '../../../../messages/vi/overview.json';
import common from '../../../../messages/vi/common.json';
import { OverviewScreen } from './overview-screen';

const state = vi.hoisted(() => ({
  data: undefined as AdminOverview | undefined,
  params: { from: '', to: '', period: 'month' },
  update: vi.fn(),
  refetch: vi.fn(),
  pending: false,
  error: false,
}));
vi.mock('../hooks/use-overview', () => ({
  useOverview: () => ({
    data: state.data,
    isPending: state.pending,
    isError: state.error,
    isFetching: false,
    refetch: state.refetch,
  }),
}));
vi.mock('../hooks/use-overview-url', () => ({
  useOverviewUrl: () => ({ params: state.params, update: state.update }),
}));
vi.mock('./system-flow', () => ({ SystemFlow: () => null }));
vi.mock('./conversion-table', () => ({ ConversionTable: () => null }));
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<typeof Ui>()),
  DateRangePicker: ({ value, onChange }: DateRangePickerProps) => (
    <button
      type="button"
      onClick={() =>
        onChange?.([dayjs('2026-10-01'), dayjs('2026-10-15')], ['2026-10-01', '2026-10-15'])
      }
    >
      {value?.[0]?.format('YYYY-MM-DD')} range
    </button>
  ),
}));

const mount = () =>
  render(
    <NextIntlClientProvider
      locale="vi"
      timeZone="Asia/Ho_Chi_Minh"
      messages={{ overview, common, ui }}
    >
      <OverviewScreen />
    </NextIntlClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  state.data = mockOverview({}, new Date('2026-10-16T08:00:00Z'));
  state.params = { from: '', to: '', period: 'month' };
  state.pending = false;
  state.error = false;
});
afterEach(cleanup);

describe('REQ-122 overview controls', () => {
  it('REQ-122 picker writes a date pair and preserves period in URL patch', () => {
    state.params.period = 'week';
    mount();
    fireEvent.click(screen.getByRole('button', { name: /range/ }));
    expect(state.update).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-15' });
  });
  it('REQ-122 period click and keyboard tabs keep range and selected state', () => {
    const view = mount();
    const month = screen.getByRole('tab', { name: 'Tháng' });
    expect(month.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Tuần' }));
    expect(state.update).toHaveBeenCalledWith({ period: 'week' });
    fireEvent.keyDown(month, { key: 'ArrowRight' });
    expect(state.update).toHaveBeenCalledWith({ period: 'year' });
    state.params.period = 'year';
    state.data = mockOverview({ period: 'year' }, new Date('2026-10-16T08:00:00Z'));
    view.rerender(
      <NextIntlClientProvider locale="vi" messages={{ overview, common, ui }}>
        <OverviewScreen />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Năm' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('2022')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
  });
  it('REQ-122 loading and retry do not display data from an old filter', () => {
    state.data = undefined;
    state.pending = true;
    mount();
    expect(screen.getByRole('status').textContent).toBe(common.state.loading);
    expect(screen.getByRole('tab', { name: 'Tháng' })).toBeTruthy();
    expect(document.querySelector('[data-m="bars"]')?.children.length).toBe(0);
    cleanup();
    state.pending = false;
    state.error = true;
    mount();
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: common.state.retry }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it('REQ-122 D-140 custom range labels do not say current month', () => {
    state.params.from = '2026-09-01';
    state.params.to = '2026-10-15';
    mount();
    expect(screen.getByText('Trong khoảng đã chọn')).toBeTruthy();
    expect(screen.getByText(/thành viên trong khoảng đã chọn/)).toBeTruthy();
    expect(screen.queryByText(/thành viên tháng này/)).toBeNull();
  });
});
