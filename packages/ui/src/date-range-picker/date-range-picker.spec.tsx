import { cleanup, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
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
});
