import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { StoresHeader } from './stores-header';

vi.mock('@opchub/ui', () => ({
  PageHeader: ({ title, extra }: { title: string; extra: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {extra}
    </div>
  ),
  DateRangePicker: ({ className }: { className: string }) => (
    <button className={className}>Date range</button>
  ),
}));
afterEach(cleanup);
it('retains the translated title and functional range control with locally scoped styling', () => {
  const view = render(
    <NextIntlClientProvider locale="vi" messages={{ stores: { title: 'Gian hàng' } }}>
      <StoresHeader />
    </NextIntlClientProvider>,
  );
  expect(screen.getByRole('heading', { name: 'Gian hàng' })).toBeTruthy();
  const control = screen.getByRole('button', { name: 'Date range' });
  expect(control.getAttribute('class')).toBeTruthy();
  expect(control.hasAttribute('disabled')).toBe(false);
  expect(view.container.querySelector('[data-store-header]')).toBeTruthy();
});
