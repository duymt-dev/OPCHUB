import { renderHook, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Grants } from '@/lib/permission-model';
import { useAdminNav } from './use-admin-nav';

const state = vi.hoisted(() => ({ keys: ['bots.view'] as Grants['keys'] }));
vi.mock('next/navigation', () => ({ usePathname: () => '/bots' }));
vi.mock('@/lib/permissions', () => ({
  useGrants: () => ({ keys: state.keys, roleName: '', previewing: false }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  state.keys = ['bots.view'];
});

describe('REQ-140 Bot navigation without deployment flags', () => {
  it.each([undefined, 'off', 'on'])('shows authorized Bot with legacy flag %s', (value) => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'off');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_BOTS', value);
    const { result } = renderHook(() => useAdminNav());
    expect(result.current.items.some((item) => item.key === 'bots')).toBe(true);
    expect(result.current.allowed).toBe(true);
  });

  it('still denies Bot without its permission', () => {
    state.keys = [];
    const { result } = renderHook(() => useAdminNav());
    expect(result.current.items.some((item) => item.key === 'bots')).toBe(false);
    expect(result.current.allowed).toBe(false);
  });
});
