import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { StrictMode } from 'react';
vi.mock('@/lib/session', () => ({ refreshSession: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_API_URL: '/v1' } }));
import { useAuthStore } from '@/lib/auth-store';
import { refreshSession } from '@/lib/session';
import { GuestViewBeacon } from './guest-view-beacon';
const beacon = vi.fn(),
  fetcher = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: null, me: null });
  beacon.mockReturnValue(true);
  fetcher.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('navigator', { webdriver: false, sendBeacon: beacon });
  vi.stubGlobal('fetch', fetcher);
  vi.mocked(refreshSession).mockResolvedValue(false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('REQ-627 B15 guest beacon', () => {
  it('REQ-627 strict-mode sends exactly one beacon with empty body after display', async () => {
    render(
      <StrictMode>
        <GuestViewBeacon slug="test-store" />
      </StrictMode>,
    );
    await waitFor(() => expect(beacon).toHaveBeenCalledTimes(1));
    expect(beacon.mock.calls[0]?.[0]).toBe('/v1/public/stores/test-store/view');
    expect(beacon.mock.calls[0]?.[1]).toBeInstanceOf(Blob);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('REQ-627 webdriver sends nothing and does not refresh a session', () => {
    vi.stubGlobal('navigator', { webdriver: true, sendBeacon: beacon });
    render(<GuestViewBeacon slug="test-store" />);
    expect(beacon).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });
  it('REQ-627 beacon rejection falls back to keepalive; no analytics error reaches UI', async () => {
    beacon.mockReturnValue(false);
    fetcher.mockRejectedValue(new Error('offline'));
    render(<GuestViewBeacon slug="test-store" />);
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        '/v1/public/stores/test-store/view',
        expect.objectContaining({ keepalive: true, method: 'POST' }),
      ),
    );
  });
  it('REQ-627 new preview tab refreshes existing session and sends bearer for server owner exclusion', async () => {
    vi.mocked(refreshSession).mockImplementation(() => {
      useAuthStore.setState({ accessToken: 'owner-access' });
      return Promise.resolve(true);
    });
    render(<GuestViewBeacon slug="test-store" />);
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        '/v1/public/stores/test-store/view',
        expect.objectContaining({ headers: { Authorization: 'Bearer owner-access' } }),
      ),
    );
    expect(beacon).not.toHaveBeenCalled();
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
