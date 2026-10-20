import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAdminMeOf } from '@opchub/shared/mock-domains';
import { useAuthStore } from '@/lib/auth-store';
import { refreshSession } from '@/lib/session';
import { AuthGate } from './auth-gate';
import { SetupGate } from './setup-gate';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/affiliate',
}));
vi.mock('@/lib/session', () => ({ refreshSession: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ me: null, accessToken: null, preview: null, signedOut: false });
  window.history.replaceState(null, '', '/affiliate?q=Ha&page=2');
});
afterEach(cleanup);

function restore() {
  useAuthStore.getState().setSession('mock.admin', mockAdminMeOf('admin')!);
  return Promise.resolve(true);
}

describe('REQ-312 same refresh lifecycle for MSW/native Admin gates', () => {
  it('AuthGate tries refresh before redirecting and preserves a restored page/query', async () => {
    vi.mocked(refreshSession).mockImplementation(restore);
    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>,
    );
    await waitFor(() => expect(screen.getByText('Protected content')).toBeTruthy());
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });
  it('failed refresh redirects to login with the entire original query', async () => {
    vi.mocked(refreshSession).mockResolvedValue(false);
    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>,
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/login?next=%2Faffiliate%3Fq%3DHa%26page%3D2'),
    );
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Protected content')).toBeNull();
  });
  it('SetupGate refreshes on reload instead of skipping the fake backend', async () => {
    vi.mocked(refreshSession).mockImplementation(restore);
    render(
      <SetupGate>
        <p>Setup content</p>
      </SetupGate>,
    );
    await waitFor(() => expect(screen.getByText('Setup content')).toBeTruthy());
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });
  it('SetupGate still denies access after a failed refresh', async () => {
    vi.mocked(refreshSession).mockResolvedValue(false);
    render(
      <SetupGate>
        <p>Setup content</p>
      </SetupGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Setup content')).toBeNull();
  });
});
