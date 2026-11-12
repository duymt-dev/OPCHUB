import ui from '../../../../messages/vi/ui.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ToastProvider } from '@opchub/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';
import overview from '../../../../messages/vi/overview.json';
import * as api from '../data';
import { ConversionTable } from './conversion-table';
import { conversionTone } from './conversion-grid';

vi.mock('../data', async (original) => ({
  ...(await original<typeof api>()),
  fetchConversion: vi.fn(),
}));
afterEach(cleanup);
describe('REQ-623 conversion table', () => {
  it('colors80/70/50, national total, exact headings and unappointed director', async () => {
    const rows = (['north', 'central', 'south'] as const).map((region, i) => ({
      region,
      label: ['Miền Bắc', 'Miền Trung', 'Miền Nam'][i] ?? '',
      directorName: i === 0 ? 'Director' : null,
      trial: 0,
      paid: [8, 7, 1][i] ?? 0,
      expired: [2, 3, 1][i] ?? 0,
      ratePct: [80, 70, 50][i] ?? 0,
    }));
    vi.mocked(api.fetchConversion).mockResolvedValue({
      rows,
      total: { trial: 4, paid: 17, expired: 7, ratePct: 71 },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    try {
      render(
        <NextIntlClientProvider locale="vi" messages={{ overview, ui }}>
          <QueryClientProvider client={client}>
            <ToastProvider>
              <ConversionTable />
            </ToastProvider>
          </QueryClientProvider>
        </NextIntlClientProvider>,
      );
      await screen.findByText('80%');
      expect(screen.getByText('70%')).toBeTruthy();
      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.getByText('71%')).toBeTruthy();
      expect(screen.getAllByText('Chưa bổ nhiệm')).toHaveLength(2);
      expect(screen.getAllByRole('columnheader')).toHaveLength(6);
      expect(screen.getByRole('button', { name: 'Xuất CSV' })).toBeTruthy();
      expect([
        conversionTone(80),
        conversionTone(70),
        conversionTone(50),
        conversionTone(0),
      ]).toEqual(['green', 'blue', 'orange', 'orange']);
    } finally {
      client.clear();
    }
  });
});
