import { afterEach, expect, it, vi } from 'vitest';
import { navigateAfterAdminAuth } from './navigate-after-auth';

afterEach(() => vi.restoreAllMocks());

it.each(['/first-password', '/two-factor'] as const)(
  'D-141 AC824-04/15 retains Auth form scroll for %s without changing setup target',
  (setup) => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const replace = vi.fn();
    navigateAfterAdminAuth({ replace }, setup, '/members?page=2#retained');
    expect(scroll).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledExactlyOnceWith(setup, { scroll: false });
  },
);
it('D-141 AC824-05 resets completed app entry before exact safe next/query/hash navigation', () => {
  const order: string[] = [];
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
    order.push('scroll');
  });
  const replace = vi.fn(() => {
    order.push('replace');
  });
  navigateAfterAdminAuth({ replace }, null, '/members?status=active&page=2#retained');
  expect(scroll).toHaveBeenCalledExactlyOnceWith(0, 0);
  expect(replace).toHaveBeenCalledExactlyOnceWith('/members?status=active&page=2#retained');
  expect(order).toEqual(['scroll', 'replace']);
});
