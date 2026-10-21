import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { PayoutDialog } from './payout-dialog';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  payAffiliateMonth: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
afterEach(cleanup);

it('REQ-309 AT-AF06 payout keeps its exact accessible action name while loading', async () => {
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.payout'],
    roleName: 'Any role',
    previewing: false,
  });
  vi.mocked(api.payAffiliateMonth).mockReturnValue(new Promise(() => undefined));
  render(
    <PayoutDialog
      intent={{ id: 'a1', name: 'Agent', month: '2026-09', amount: 150000, key: 'same-intent' }}
      onClose={vi.fn()}
    />,
    affiliateTestContext(),
  );
  const action = screen.getByRole('button', { name: 'Chi trả' });
  fireEvent.click(action);
  await waitFor(() => expect(action.classList.contains('ant-btn-loading')).toBe(true));
  // Spinner semantics must not rename the financial action, even during motion.
  expect(screen.getByRole('button', { name: 'Chi trả' })).toBe(action);
  fireEvent.click(action);
  expect(api.payAffiliateMonth).toHaveBeenCalledTimes(1);
});
