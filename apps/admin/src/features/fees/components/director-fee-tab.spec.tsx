import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { feeSummarySchema } from '@opchub/shared/api-domains';
import fees from '../../../../messages/vi/fees.json';
import { FEE_TONE, rowActions } from '../model';
import { FEE_TABS, TAB_STATUS } from '../types';
import { FeeToolbar } from './fee-toolbar';

vi.mock('../hooks/use-fee-transactions', () => ({ useUnmatchedBadge: () => null }));
afterEach(cleanup);

it('REQ-616 P9 renders a separate exemption filter/count without conflating paid or trial', () => {
  const onTab = vi.fn();
  const summary = feeSummarySchema.parse({
    total: 10,
    active: 5,
    trial: 0,
    regional_director: 3,
    pending_payment: 0,
    expiring: 0,
    expired: 2,
    paid: 5,
    revenue: 13200000,
  });
  render(
    <NextIntlClientProvider locale="vi" messages={{ fees }}>
      <FeeToolbar
        q=""
        status="gdv"
        summary={summary}
        onSearch={vi.fn()}
        onTab={onTab}
        onRemindAll={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
  expect(screen.getAllByRole('radio')).toHaveLength(7);
  const tab = screen.getByRole('radio', { name: 'Miễn phí · GĐ Vùng3' });
  expect(tab.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(tab);
  expect(onTab).toHaveBeenCalledWith('gdv');
  expect(FEE_TABS).toEqual(['all', 'active', 'trial', 'gdv', 'pending', 'soon', 'expired']);
  expect(TAB_STATUS.gdv).toBe('regional_director');
  expect(FEE_TONE.regional_director).toBe('gdv');
  expect(rowActions('regional_director')).toEqual({ collect: false, renew: false, remind: false });
});
