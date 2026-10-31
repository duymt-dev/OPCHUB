import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AffiliatePolicy } from '@opchub/shared/api-domains';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { revenueKeys } from '../revenue-sharing-api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { PolicyForm } from './policy-form';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('@/lib/use-prices', () => ({ usePrices: () => undefined }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  saveAffiliatePolicy: vi.fn(),
}));
const value: AffiliatePolicy = {
  defaultRate: 20,
  cookieDays: 30,
  fundraisingRate: 10,
  terms: 'Existing terms',
  yearOneRate: 63,
  annualDecrease: 7,
  minimumRate: 21,
};
const labels = {
  yearOneRate: 'GĐ Vùng năm 1',
  annualDecrease: 'Giảm mỗi năm từ năm 2',
  minimumRate: 'Mức duy trì tối thiểu (chi phí vận hành)',
};
const field = (key: keyof typeof labels) =>
  screen.getByRole<HTMLInputElement>('spinbutton', { name: labels[key] });
const submit = () => fireEvent.submit(screen.getByRole('form', { name: 'Chính sách' }));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action'],
    roleName: 'Test',
    previewing: false,
  });
  vi.mocked(api.saveAffiliatePolicy).mockImplementation((body) => Promise.resolve(body));
});
afterEach(cleanup);

describe('REQ-617 sharing policy form', () => {
  it('edits all supplied rates and refreshes both policy and revenue reads only after saving', async () => {
    const context = affiliateTestContext();
    const invalidate = vi.spyOn(context.client, 'invalidateQueries');
    render(<PolicyForm value={value} />, context);
    expect(field('yearOneRate').value).toBe('63');
    expect(field('annualDecrease').value).toBe('7');
    expect(field('minimumRate').value).toBe('21');
    fireEvent.change(field('yearOneRate'), { target: { value: '72' } });
    fireEvent.change(field('annualDecrease'), { target: { value: '8' } });
    fireEvent.change(field('minimumRate'), { target: { value: '24' } });
    expect(api.saveAffiliatePolicy).not.toHaveBeenCalled();
    submit();
    await waitFor(() =>
      expect(api.saveAffiliatePolicy).toHaveBeenCalledWith({
        ...value,
        yearOneRate: 72,
        annualDecrease: 8,
        minimumRate: 24,
      }),
    );
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: revenueKeys.all }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: api.affiliateKeys.all });
  });
  it('rejects a floor above year one at its field without silently changing the draft', async () => {
    render(<PolicyForm value={value} />, affiliateTestContext());
    fireEvent.change(field('yearOneRate'), { target: { value: '20' } });
    submit();
    await waitFor(() => expect(field('minimumRate').getAttribute('aria-invalid')).toBe('true'));
    expect(await screen.findByText('Mức tối thiểu không được vượt tỷ lệ năm đầu')).toBeDefined();
    expect(field('yearOneRate').value).toBe('20');
    expect(api.saveAffiliatePolicy).not.toHaveBeenCalled();
    fireEvent.change(field('minimumRate'), { target: { value: '10' } });
    submit();
    await waitFor(() =>
      expect(api.saveAffiliatePolicy).toHaveBeenCalledWith({
        ...value,
        yearOneRate: 20,
        minimumRate: 10,
      }),
    );
  });
  it.each(['yearOneRate', 'annualDecrease', 'minimumRate'] as const)(
    'rejects noninteger %s without coercing or saving it',
    async (key) => {
      render(<PolicyForm value={{ ...value, [key]: 1.5 }} />, affiliateTestContext());
      submit();
      await waitFor(() => expect(field(key).getAttribute('aria-invalid')).toBe('true'));
      expect(field(key).value).toBe('1.5');
      expect(api.saveAffiliatePolicy).not.toHaveBeenCalled();
    },
  );
  it.each(['yearOneRate', 'annualDecrease', 'minimumRate'] as const)(
    'maps server %s error, preserves values and allows retry',
    async (key) => {
      vi.mocked(api.saveAffiliatePolicy).mockRejectedValueOnce(
        new ApiError('VALIDATION_ERROR', 400, 'Policy validation', [
          { path: key, message: 'Rejected value' },
        ]),
      );
      render(<PolicyForm value={value} />, affiliateTestContext());
      submit();
      await waitFor(() => expect(field(key).getAttribute('aria-invalid')).toBe('true'));
      expect(field(key).value).toBe(String(value[key]));
      submit();
      await waitFor(() => expect(api.saveAffiliatePolicy).toHaveBeenCalledTimes(2));
      expect(api.saveAffiliatePolicy).toHaveBeenLastCalledWith(value);
    },
  );
  it('holds all three inputs disabled until the mutation resolves', async () => {
    let finish: ((policy: AffiliatePolicy) => void) | undefined;
    const pending = new Promise<AffiliatePolicy>((resolve) => {
      finish = resolve;
    });
    vi.mocked(api.saveAffiliatePolicy).mockReturnValue(pending);
    render(<PolicyForm value={value} />, affiliateTestContext());
    submit();
    await waitFor(() => expect(field('yearOneRate').disabled).toBe(true));
    expect(field('annualDecrease').disabled).toBe(true);
    expect(field('minimumRate').disabled).toBe(true);
    await act(async () => {
      finish?.(value);
      await pending;
    });
    await waitFor(() => expect(field('yearOneRate').disabled).toBe(false));
  });
});
