import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import affiliate from '../../../../messages/vi/affiliate.json';
import { MyRegionMonths } from './my-region-months';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('TIP821 parity reserves90px for month and preserves the prototype480px scrollable table', () => {
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
  const { container } = render(
    <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
      <MyRegionMonths
        rows={[{ monthKey: '2029-10', amount: 720000, status: 'pending', paidAt: null }]}
      />
    </NextIntlClientProvider>,
  );
  const widths = [...container.querySelectorAll('col')].map((col) => col.style.width);
  expect(widths).toEqual(['', '150px', '120px', '120px']);
  expect(480 - widths.slice(1).reduce((sum, width) => sum + Number.parseInt(width, 10), 0)).toBe(
    90,
  );
  expect(screen.getByText('Tháng 10/2029')).toBeDefined();
  expect(screen.getAllByRole('columnheader')).toHaveLength(4);
  expect(screen.queryByRole('button')).toBeNull();
});
