import { profileSchema } from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const AUTH = { Authorization: 'Bearer mock.m1' };

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const send = (path: string, method = 'GET', body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe('MSW portal — hồ sơ (GET/PATCH /me + bổ sung)', () => {
  it('GET /me trả hồ sơ đầy đủ, thống kê từ dữ liệu', async () => {
    const p = profileSchema.parse(await (await send('/me')).json());
    expect(p.fullName).toBe('Nguyễn Văn An');
    expect(p.business?.verification).toBe('verified');
    expect(p.stats).toEqual({ groups: 3, events: 1, projects: 1 });
    expect(p.linkedSso).toEqual(['google', 'linkedin']);
  });

  it('PATCH /me lưu, MST bị khoá khi đã xác minh (403)', async () => {
    const r = await send('/me', 'PATCH', { city: 'Hà Nội', business: { field: 'Logistics' } });
    const p = profileSchema.parse(await r.json());
    expect(p.city).toBe('Hà Nội');
    expect(p.business?.field).toBe('Logistics');
    expect((await send('/me', 'PATCH', { business: { taxCode: '1' } })).status).toBe(403);
    expect((await send('/me', 'PATCH', { fullName: '' })).status).toBe(400);
  });

  it('rời nhóm làm giảm số Nhóm', async () => {
    await send('/groups/c1/join', 'DELETE');
    const p = profileSchema.parse(await (await send('/me')).json());
    expect(p.stats.groups).toBe(2);
  });

  it('đổi mật khẩu: sai hiện tại 400, yếu 400, đúng 204', async () => {
    const bad = await send('/auth/password/change', 'POST', {
      currentPassword: 'x',
      newPassword: 'Abcdefg1',
    });
    expect(bad.status).toBe(400);
    const weak = await send('/auth/password/change', 'POST', {
      currentPassword: 'User@2026',
      newPassword: 'abc',
    });
    expect(weak.status).toBe(400);
    const ok = await send('/auth/password/change', 'POST', {
      currentPassword: 'User@2026',
      newPassword: 'Abcdefg1',
    });
    expect(ok.status).toBe(204);
  });

  it('đăng xuất thiết bị khác + liên kết SSO', async () => {
    const r = (await (await send('/auth/sessions/revoke-others', 'POST')).json()) as {
      revoked: number;
    };
    expect(r.revoked).toBe(2);
    await send('/me/sso/google', 'DELETE');
    await send('/me/sso/facebook', 'POST');
    const p = profileSchema.parse(await (await send('/me')).json());
    expect(p.linkedSso.sort()).toEqual(['facebook', 'linkedin']);
  });

  it('presign + PUT + GET ảnh đại diện', async () => {
    const pre = (await (
      await send('/uploads/presign', 'POST', { kind: 'avatar', contentType: 'image/png', size: 3 })
    ).json()) as { uploadUrl: string; publicUrl: string };
    await fetch(pre.uploadUrl, {
      method: 'PUT',
      body: new Uint8Array([1, 2, 3]),
      headers: { 'Content-Type': 'image/png' },
    });
    const img = await fetch(pre.publicUrl);
    expect(img.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await img.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(
      (
        await send('/uploads/presign', 'POST', {
          kind: 'avatar',
          contentType: 'image/gif',
          size: 3,
        })
      ).status,
    ).toBe(400);
  });
});
