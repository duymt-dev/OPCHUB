import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { affiliateTestContext } from '../../tests/context';
import { regionalShareKey } from '../share-api';
import { useRegionalWrites } from './use-regional-writes';
vi.mock('@/lib/permissions', () => ({ useCan: () => true }));
vi.mock('../api', () => ({
  regionalKey: ['admin-regional-directors'],
  appointRegional: vi.fn(),
  revokeRegional: vi.fn(),
  patchRegional: vi.fn().mockResolvedValue({ updated: true }),
}));
afterEach(cleanup);
describe('TIP-V46-802 current regional payee cache', () => {
  it('slot/bank changes invalidate cached ledger summaries as well as configuration', async () => {
    const context = affiliateTestContext();
    context.client.setQueryData(regionalShareKey, { cached: true });
    const { result } = renderHook(() => useRegionalWrites('north'), context);
    await act(async () => {
      await result.current.mutateAsync({ kind: 'patch', patch: { provinces: [] } });
    });
    expect(context.client.getQueryState(regionalShareKey)?.isInvalidated).toBe(true);
  });
});
