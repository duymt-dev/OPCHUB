import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, ApiError } from './api-client';
import { useAuthStore } from './auth-store';
import { refreshSession } from './session';

const ADMIN = {
  id: 'm1',
  name: 'Nguyễn An',
  email: 'an@example.vn',
  roleId: 'r-admin',
  roleName: 'Quản trị viên',
  isSuperAdmin: false,
  permissions: [],
  mustChangePassword: false,
  twoFactor: false,
  twoFactorRequired: false,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const unauthorized = () =>
  json(401, { error: { code: 'UNAUTHORIZED', message: 'Hết phiên', requestId: 'r1' } });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  useAuthStore.setState({ accessToken: 'old', me: null, signedOut: false });
});
afterEach(() => vi.unstubAllGlobals());

const urlOf = (i: number) => {
  const u = fetchMock.mock.calls[i]?.[0];
  return typeof u === 'string' ? u : u instanceof URL ? u.href : (u?.url ?? '');
};

describe('refresh khi 401 (B60)', () => {
  it('401 → refresh một lần → thử lại với token mới', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(200, { accessToken: 'new', admin: ADMIN }))
      .mockResolvedValueOnce(json(200, { n: 1 }));
    const out = await api('/x', { schema: z.object({ n: z.number() }) });
    expect(out).toEqual({ n: 1 });
    expect(urlOf(1)).toContain('/admin/auth/refresh');
    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer new');
    expect(useAuthStore.getState().accessToken).toBe('new');
  });

  it('refresh hỏng → xoá phiên, ném lỗi 401 gốc', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());
    await expect(api('/x', { schema: z.null() })).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('đường /admin/auth/* không refresh (tránh vòng lặp)', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized());
    await expect(api('/admin/auth/login', { schema: z.null() })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('single-flight: hai lần gọi song song chỉ refresh một lần', async () => {
    fetchMock.mockResolvedValue(json(200, { accessToken: 'new', admin: ADMIN }));
    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);
    expect(a && b).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
