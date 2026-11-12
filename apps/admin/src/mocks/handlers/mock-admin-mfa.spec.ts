import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { totpVerifySchema, ADMIN_AUTH_MESSAGES } from '@opchub/shared/api';
import { issueMockAdminMfa, verifyMockAdminMfa } from './mock-admin-mfa';
import { mockAdminSessionResponse } from './mock-admin-session';
import { verifyMockTotp } from './totp';

vi.mock('./totp', () => ({ verifyMockTotp: vi.fn() }));
vi.mock('./mock-admin-session', () => ({
  mockAdminSessionResponse: vi.fn((id: string) => Response.json({ id })),
}));
const request = (token: string, code = '123456') =>
  new Request('http://localhost/v1/admin/auth/totp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken: token, code }),
  });
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000000);
  vi.mocked(verifyMockTotp).mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('D-141 AC824-04 native-compatible opaque mock MFA challenge', () => {
  it('accepts short account IDs without weakening the real shared token schema', async () => {
    const token = issueMockAdminMfa('short');
    expect(token.length).toBe(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(totpVerifySchema.safeParse({ mfaToken: token, code: '123456' }).success).toBe(true);
    expect((await verifyMockAdminMfa(request(token))).status).toBe(200);
    expect(mockAdminSessionResponse).toHaveBeenCalledExactlyOnceWith('short');
  });
  it('consumes a successful challenge only once', async () => {
    const token = issueMockAdminMfa('owned');
    expect((await verifyMockAdminMfa(request(token))).status).toBe(200);
    expect((await verifyMockAdminMfa(request(token))).status).toBe(401);
    expect(mockAdminSessionResponse).toHaveBeenCalledTimes(1);
  });
  it('expires at the existing native five-minute boundary', async () => {
    const token = issueMockAdminMfa('owned');
    vi.advanceTimersByTime(5 * 60 * 1000);
    const result = await verifyMockAdminMfa(request(token));
    expect(result.status).toBe(401);
    expect(verifyMockTotp).not.toHaveBeenCalled();
    expect(mockAdminSessionResponse).not.toHaveBeenCalled();
  });
  it('retains the challenge for four wrong codes and revokes on the fifth', async () => {
    const token = issueMockAdminMfa('owned');
    vi.mocked(verifyMockTotp).mockResolvedValue(false);
    for (let i = 0; i < 5; i++) {
      const result = await verifyMockAdminMfa(request(token));
      expect(result.status).toBe(401);
      const body: unknown = await result.json();
      expect(body).toMatchObject({ error: { message: ADMIN_AUTH_MESSAGES.codeInvalid } });
    }
    vi.mocked(verifyMockTotp).mockResolvedValue(true);
    expect((await verifyMockAdminMfa(request(token))).status).toBe(401);
    expect(verifyMockTotp).toHaveBeenCalledTimes(5);
    expect(mockAdminSessionResponse).not.toHaveBeenCalled();
  });
  it('allows a correct code after fewer than five wrong codes', async () => {
    const token = issueMockAdminMfa('owned');
    vi.mocked(verifyMockTotp).mockResolvedValueOnce(false);
    expect((await verifyMockAdminMfa(request(token))).status).toBe(401);
    expect((await verifyMockAdminMfa(request(token))).status).toBe(200);
  });
  it('does not accept invented tokens or the old short ID token', async () => {
    expect((await verifyMockAdminMfa(request('mfa.short'))).status).toBe(400);
    expect((await verifyMockAdminMfa(request('x'.repeat(32)))).status).toBe(401);
    expect(mockAdminSessionResponse).not.toHaveBeenCalled();
  });
});
