import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import { useMyRegion } from './use-my-region';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('TIP-V46-804 optional region query', () => {
  it('keeps none as a successful, bank-free result', async () => {
    vi.spyOn(api, 'fetchMyRegion').mockResolvedValue({ state: 'none' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(useMyRegion, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ state: 'none' });
    client.clear();
  });
  it('reports a sanitized error without leaking credentials/bank or throwing through render', async () => {
    vi.spyOn(api, 'fetchMyRegion').mockRejectedValue(
      new Error('private response must not be logged'),
    );
    const report = vi.fn();
    vi.stubGlobal('reportError', report);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(useMyRegion, { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(report).toHaveBeenCalledWith(new Error('GET /me/gdv failed'));
    client.clear();
  });
});
