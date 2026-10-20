import { Form } from 'antd';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AffiliateAdminPolicyPreview } from '@opchub/shared/api-domains';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { useAffiliatePolicyPreview } from '../hooks/use-affiliate-policy-preview';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { PolicyFields } from './policy-fields';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  fetchAffiliatePolicyPreview: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view'],
    roleName: 'Viewer',
    previewing: false,
  });
  vi.mocked(api.fetchAffiliatePolicyPreview).mockResolvedValue({
    rate: 20,
    feeAmount: 600001,
    commission: 12345,
  });
});
afterEach(cleanup);

describe('REQ-308 REQ-312 policy caption consumes the current server preview only', () => {
  it('formats the actual response amounts instead of calculating a frontend example', async () => {
    render(
      <Form initialValues={{ defaultRate: 20, cookieDays: 30 }}>
        <PolicyFields />
      </Form>,
      affiliateTestContext(),
    );
    await waitFor(() =>
      expect(screen.getByText(/^= 12\.345đ \/ thành viên 600\.001đ$/)).toBeTruthy(),
    );
    expect(api.fetchAffiliatePolicyPreview).toHaveBeenCalledWith(20);
  });

  it.each([undefined, null, 0, 51, 1.5, '20'])(
    'never requests a preview for invalid form value %s',
    (value) => {
      const { result } = renderHook(() => useAffiliatePolicyPreview(value), affiliateTestContext());
      expect(result.current.valid).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(api.fetchAffiliatePolicyPreview).not.toHaveBeenCalled();
    },
  );

  it('does not expose a cached preview or request data without view permission', () => {
    vi.mocked(useGrants).mockReturnValue({ keys: [], roleName: 'None', previewing: false });
    const context = affiliateTestContext();
    context.client.setQueryData(api.affiliateKeys.policyPreview(20), {
      rate: 20,
      feeAmount: 600000,
      commission: 120000,
    });
    const { result } = renderHook(() => useAffiliatePolicyPreview(20), context);
    expect(result.current.valid).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(api.fetchAffiliatePolicyPreview).not.toHaveBeenCalled();
  });

  it('ignores a late response for the old rate after the new draft has resolved', async () => {
    let oldDone: ((value: AffiliateAdminPolicyPreview) => void) | undefined;
    let newDone: ((value: AffiliateAdminPolicyPreview) => void) | undefined;
    const oldRequest = new Promise<AffiliateAdminPolicyPreview>((resolve) => {
      oldDone = resolve;
    });
    const newRequest = new Promise<AffiliateAdminPolicyPreview>((resolve) => {
      newDone = resolve;
    });
    vi.mocked(api.fetchAffiliatePolicyPreview).mockImplementation((rate) =>
      rate === 20 ? oldRequest : newRequest,
    );
    const context = affiliateTestContext();
    const { result, rerender } = renderHook(({ value }) => useAffiliatePolicyPreview(value), {
      ...context,
      initialProps: { value: 20 },
    });
    await waitFor(() => expect(api.fetchAffiliatePolicyPreview).toHaveBeenCalledWith(20));
    rerender({ value: 27 });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(api.fetchAffiliatePolicyPreview).toHaveBeenCalledWith(27));
    await act(async () => {
      newDone?.({ rate: 27, feeAmount: 600000, commission: 162000 });
      await newRequest;
    });
    await waitFor(() => expect(result.current.data?.commission).toBe(162000));
    await act(async () => {
      oldDone?.({ rate: 20, feeAmount: 600000, commission: 120000 });
      await oldRequest;
    });
    expect(result.current.data?.rate).toBe(27);
    expect(result.current.data?.commission).toBe(162000);
  });

  it('rejects a response labelled with a different rate', async () => {
    vi.mocked(api.fetchAffiliatePolicyPreview).mockResolvedValue({
      rate: 27,
      feeAmount: 600000,
      commission: 162000,
    });
    const { result } = renderHook(() => useAffiliatePolicyPreview(20), affiliateTestContext());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('reports an unavailable preview without manufacturing an amount after API failure', async () => {
    vi.mocked(api.fetchAffiliatePolicyPreview).mockRejectedValue(new Error('Network unavailable'));
    const { result } = renderHook(() => useAffiliatePolicyPreview(20), affiliateTestContext());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
