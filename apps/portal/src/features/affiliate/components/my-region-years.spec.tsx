import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import affiliate from '../../../../messages/vi/affiliate.json';
import { MyRegionYears } from './my-region-years';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());
describe('MyRegion year table prototype numeric alignment', () => {
  it('right-aligns numeric headers and cells without changing labels or amounts', () => {
    render(
      <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
        <MyRegionYears
          rows={[{ year: 1, percent: 20, count: 3, revenue: 1200000, share: 240000 }]}
        />
      </NextIntlClientProvider>,
    );
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(5);
    expect(headers[0]?.style.textAlign).not.toBe('right');
    for (const header of headers.slice(1)) expect(header.style.textAlign).toBe('right');
    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual([
      'Năm 1 · khách mới',
      '20%',
      '3',
      '1.200.000đ',
      '240.000đ',
    ]);
    for (const cell of cells.slice(1)) expect(cell.style.textAlign).toBe('right');
  });
});
