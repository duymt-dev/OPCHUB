import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAffiliatePage } from './use-affiliate-page';

afterEach(cleanup);
describe('REQ-312 URL pagination after data shrinks', () => {
  it('moves an out-of-range page to the last actual page, including an empty list', () => {
    const update = vi.fn();
    const { rerender } = renderHook(
      ({ total }) => useAffiliatePage({ page: 3, size: 10 }, { total }, update),
      { initialProps: { total: 11 } },
    );
    expect(update).toHaveBeenLastCalledWith({ page: 2 });
    rerender({ total: 0 });
    expect(update).toHaveBeenLastCalledWith({ page: 1 });
  });
  it('does not change URL before data arrives or when the current page is valid', () => {
    const update = vi.fn();
    const initialProps: { total: number | undefined } = { total: undefined };
    const { rerender } = renderHook(
      ({ total }: { total: number | undefined }) =>
        useAffiliatePage(
          { page: 2, size: 10 },
          total === undefined ? undefined : { total },
          update,
        ),
      { initialProps },
    );
    expect(update).not.toHaveBeenCalled();
    rerender({ total: 20 });
    expect(update).not.toHaveBeenCalled();
  });
});
