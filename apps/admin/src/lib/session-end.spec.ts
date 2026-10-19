import { ACCOUNT_LOCKED_MESSAGE } from '@opchub/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api } from './api-client';
import { useAuthStore } from './auth-store';
import { endSession, lockedReasonOf, parseEndReason, setSessionEndNavigator } from './session-end';

const ME = {
  id: 'm1',
  fullName: 'Nguyễn An',
  email: 'an@example.vn',
  accountType: 'personal',
  systemRole: 'admin',
  status: 'active',
  avatarUrl: null,
  membershipFee: null,
} as const;

const locked = () =>
  new Response(
    JSON.stringify({
      error: { code: 'FORBIDDEN', message: ACCOUNT_LOCKED_MESSAGE, requestId: 'r' },
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );

const fetchMock = vi.fn<typeof fetch>();
const nav = vi.fn<(href: string) => void>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  nav.mockReset();
  setSessionEndNavigator(nav);
  useAuthStore.setState({ accessToken: 't', me: ME, signedOut: false });
});
afterEach(() => {
  setSessionEndNavigator(null);
  vi.unstubAllGlobals();
});

describe('thu hồi phiên phía client (TIP-V2-104, NA-16)', () => {
  it('REQ-216 parseEndReason chỉ nhận lý do đã biết', () => {
    expect(parseEndReason('locked')).toBe('locked');
    expect(parseEndReason('password_changed')).toBe('password_changed');
    expect(parseEndReason('x')).toBeNull();
    expect(parseEndReason(null)).toBeNull();
  });

  it('REQ-216 lockedReasonOf: chỉ 403 đúng thông điệp khoá', () => {
    expect(lockedReasonOf(403, ACCOUNT_LOCKED_MESSAGE)).toBe('locked');
    expect(lockedReasonOf(403, 'Không có quyền')).toBeNull();
    expect(lockedReasonOf(401, ACCOUNT_LOCKED_MESSAGE)).toBeNull();
  });

  it('REQ-216 endSession → xoá phiên, về /login?reason=, gọi trùng chỉ chuyển một lần', () => {
    endSession('password_changed');
    endSession('password_changed');
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, me: null, signedOut: true });
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledWith('/login?reason=password_changed');
  });

  it('UAT-24 REQ-216 API 403 khoá khi đang có phiên → về /login?reason=locked', async () => {
    fetchMock.mockResolvedValueOnce(locked());
    await expect(api('/admin/users', { schema: z.null() })).rejects.toMatchObject({ status: 403 });
    expect(nav).toHaveBeenCalledWith('/login?reason=locked');
    expect(useAuthStore.getState().me).toBeNull();
  });

  it('REQ-216 /admin/auth/* 403 khoá (màn đăng nhập) không chuyển trang', async () => {
    useAuthStore.setState({ accessToken: null, me: null, signedOut: false });
    fetchMock.mockResolvedValueOnce(locked());
    await expect(api('/admin/auth/login', { schema: z.null() })).rejects.toMatchObject({
      status: 403,
    });
    expect(nav).not.toHaveBeenCalled();
  });
});

describe('Admin: bị thu hồi quyền quản trị (NA-28, TIP-V2-202)', () => {
  it('REQ-228 401 → refresh 401 (phiên quản trị đã thu hồi) → xoá phiên', async () => {
    const unauthorized = () =>
      new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'x', requestId: 'r' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());
    await expect(api('/admin/users', { schema: z.null() })).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().me).toBeNull();
  });
});
