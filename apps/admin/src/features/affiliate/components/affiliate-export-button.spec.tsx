import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { affiliateParamsSchema } from '../model';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { AffiliateExportButton } from './affiliate-export-button';

const state = vi.hoisted(() => ({ pending: false, mutate: vi.fn() }));
vi.mock('../hooks/use-affiliate-writes', () => ({
  useAffiliateWrites: () => ({ csv: { isPending: state.pending, mutate: state.mutate } }),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  state.pending = false;
  state.mutate.mockClear();
});
afterEach(cleanup);

describe('REQ-312 Affiliate export toolbar preserves server filters', () => {
  it('exports all matching commissions, never the visible page or invented selected IDs', () => {
    render(
      <AffiliateExportButton
        params={affiliateParamsSchema.parse({ q: 'An', status: 'paid', page: 3 })}
      />,
      affiliateTestContext(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV · Tất cả' }));
    expect(state.mutate).toHaveBeenCalledExactlyOnceWith({ type: 'com', q: 'An', status: 'paid' });
  });
  it('exports matching agents without a commission-only status filter', () => {
    render(
      <AffiliateExportButton params={affiliateParamsSchema.parse({ tab: 'aff', q: 'HAOPC' })} />,
      affiliateTestContext(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV · Tất cả' }));
    expect(state.mutate).toHaveBeenCalledExactlyOnceWith({ type: 'aff', q: 'HAOPC' });
  });
  it('does not start another export while its own mutation is pending', () => {
    state.pending = true;
    render(
      <AffiliateExportButton params={affiliateParamsSchema.parse({})} />,
      affiliateTestContext(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV · Tất cả' }));
    expect(state.mutate).not.toHaveBeenCalled();
  });
});
