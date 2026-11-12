import { cleanup, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/vi';
import { ConfigProvider } from 'antd';
import enGB from 'antd/locale/en_GB';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DateRangePicker } from './date-range-picker';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

describe('DateRangePicker', () => {
  it('renders default date range and inputs', () => {
    render(<DateRangePicker defaultValue={[dayjs('2026-10-01'), dayjs('2026-10-15')]} />);
    expect(screen.getByDisplayValue('01/10/2026')).toBeTruthy();
    expect(screen.getByDisplayValue('15/10/2026')).toBeTruthy();
  });

  it('D-141 AC824-09 scopes locale to instances without mutating the supplied dates or global locale', () => {
    const locale = dayjs.locale();
    const start = dayjs('2026-10-01').locale('vi');
    const end = dayjs('2026-10-15').locale('vi');
    render(
      <ConfigProvider locale={enGB}>
        <DateRangePicker value={[start, end]} dateLocale="en-gb" format="D MMMM YYYY" />
      </ConfigProvider>,
    );
    expect(screen.getByDisplayValue('1 October 2026')).toBeTruthy();
    expect(screen.getByDisplayValue('15 October 2026')).toBeTruthy();
    expect(start.locale()).toBe('vi');
    expect(end.locale()).toBe('vi');
    expect(dayjs.locale()).toBe(locale);
  });

  it('D-141 AC824-09 preserves controlled clearing and open-ended ranges with an optional locale', () => {
    const onChange = vi.fn();
    const view = render(
      <DateRangePicker
        value={[dayjs('2026-10-01'), null]}
        dateLocale="en-gb"
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue('01/10/2026')).toBeTruthy();
    view.rerender(<DateRangePicker value={null} dateLocale="en-gb" onChange={onChange} />);
    expect(screen.queryByDisplayValue('01/10/2026')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
