import type { AccountType, MembershipFeeStatus, SystemRole } from '@opchub/shared';
import { apiErrorSchema } from '@opchub/shared/api';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type AccessClaims,
  AccessTokenService,
  AuthStateService,
  GROUP_ROLE_PORT,
} from '@/common/auth';
import { loadEnv } from '@/common/config';
import { flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { fakeGroupRolePort, fakeGroupRoles, GuardMatrixModule } from './guard-matrix.controller';

/** Ma trận guard (auth-rbac.md) — token ký trực tiếp, không cần user trong DB */
describe('guards (TIP-B07)', () => {
  let t: TestApp;
  let tokens: AccessTokenService;
  let state: AuthStateService;
  let n = 0;

  beforeAll(async () => {
    t = await createTestApp({
      imports: [GuardMatrixModule],
      overrides: [[GROUP_ROLE_PORT, fakeGroupRolePort]],
    });
    tokens = t.app.get(AccessTokenService);
    state = t.app.get(AuthStateService);
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    fakeGroupRoles.clear();
  });

  const token = (
    o: {
      role?: SystemRole;
      type?: AccountType;
      fee?: MembershipFeeStatus | null;
      permVersion?: number;
    } = {},
  ) => {
    n += 1;
    const claims: AccessClaims = {
      sub: `g-user-${n}`,
      accountType: o.type ?? 'personal',
      systemRole: o.role ?? 'member',
      permVersion: o.permVersion ?? 1,
      membershipFee:
        o.fee === null ? null : { status: o.fee ?? 'active', validUntil: '2027-01-01T00:00:00Z' },
      mustChangePassword: false,
    };
    return tokens.sign(claims).then((tk) => ({ tk, sub: claims.sub }));
  };

  const status = async (path: string, tk?: string) =>
    (await t.call(`/guard-matrix${path}`, tk ? { token: tk } : {})).status;

  it('JwtAuth: không token / token rác / sai chữ ký → 401; @Public → 200', async () => {
    expect(await status('/portal')).toBe(401);
    expect(await status('/portal', 'abc.def.ghi')).toBe(401);
    const forged = await new SignJWT({ systemRole: 'super_admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('x')
      .setIssuer(loadEnv().JWT_ISSUER)
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('khong-phai-secret-that-cua-server-123'));
    expect(await status('/portal', forged)).toBe(401);
    expect(await status('/public')).toBe(200);
  });

  it('JwtAuth: token hết hạn → 401', async () => {
    const { tk } = await token();
    const expired = await tokens.sign(
      {
        sub: 'old',
        accountType: 'personal',
        systemRole: 'member',
        permVersion: 1,
        membershipFee: null,
        mustChangePassword: false,
      },
      new Date(Date.now() - 3_600_000),
    );
    expect(await status('/portal', tk)).toBe(200);
    expect(await status('/portal', expired)).toBe(401);
  });

  it('Paywall: pending_payment / expired → 402; active / expiring → 200', async () => {
    for (const fee of ['pending_payment', 'expired'] as const) {
      const res = await t.call('/guard-matrix/portal', { token: (await token({ fee })).tk });
      expect(res.status).toBe(402);
      expect(apiErrorSchema.parse(await res.json()).error.code).toBe('MEMBERSHIP_REQUIRED');
    }
    expect(await status('/portal', (await token({ fee: 'active' })).tk)).toBe(200);
    expect(await status('/portal', (await token({ fee: 'expiring' })).tk)).toBe(200);
  });

  it('Paywall: @SkipMembershipFee → 200 dù chưa đóng phí', async () => {
    expect(await status('/no-fee', (await token({ fee: 'pending_payment' })).tk)).toBe(200);
  });

  it('Paywall đọc Redis mới nhất (S-03): phí hết hạn sau khi phát token → 402', async () => {
    const { tk, sub } = await token({ fee: 'active' });
    await state.setFee(sub, { status: 'expired', validUntil: null });
    expect(await status('/portal', tk)).toBe(402);
  });

  it('REQ-202 BUG-018 D-57 Redis active nhưng valid_until đã qua → 402; expiring còn hạn → 200', async () => {
    const { tk, sub } = await token({ fee: 'active' });
    // Job fee-status-daily chưa chạy: Redis vẫn `active` nhưng hết hạn từ 1 phút trước
    await state.setFee(sub, {
      status: 'active',
      validUntil: new Date(Date.now() - 60_000).toISOString(),
    });
    const res = await t.call('/guard-matrix/portal', { token: tk });
    expect(res.status).toBe(402);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('MEMBERSHIP_REQUIRED');

    const ok = await token({ fee: 'expiring' });
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await state.setFee(ok.sub, { status: 'expiring', validUntil: soon });
    expect(await status('/portal', ok.tk)).toBe(200);
  });

  it('D-14: investor vào route thường → 403, route cho phép → 200', async () => {
    const { tk } = await token({ type: 'investor', fee: null });
    expect(await status('/portal', tk)).toBe(403);
    expect(await status('/investor', tk)).toBe(200);
  });

  it('Permission: moderator thiếu m.edit → 403; admin → 200; route admin bỏ paywall', async () => {
    expect(await status('/admin/m-edit', (await token({ role: 'moderator' })).tk)).toBe(403);
    expect(await status('/admin/m-edit', (await token({ role: 'member' })).tk)).toBe(403);
    expect(await status('/admin/m-edit', (await token({ role: 'admin', fee: null })).tk)).toBe(200);
  });

  it('Permission: s.role chỉ super_admin (mặc định D-46)', async () => {
    expect(await status('/admin/s-role', (await token({ role: 'admin' })).tk)).toBe(403);
    expect(await status('/admin/s-role', (await token({ role: 'super_admin' })).tk)).toBe(200);
  });

  it('Permission đọc ma trận quyền từ Redis (Cài đặt đổi quyền, B40)', async () => {
    await state.setGrants({ admin: ['m.view'], moderator: ['m.edit'], member: [] });
    expect(await status('/admin/m-edit', (await token({ role: 'moderator' })).tk)).toBe(200);
    expect(await status('/admin/m-edit', (await token({ role: 'admin' })).tk)).toBe(403);
  });

  it('AccountStatus: perm_version tăng sau khi phát token → 401; bị khoá → 403', async () => {
    const a = await token({ permVersion: 1 });
    await state.setPermVersion(a.sub, 2);
    expect(await status('/portal', a.tk)).toBe(401);
    const b = await token();
    await state.setLocked(b.sub, true);
    expect(await status('/portal', b.tk)).toBe(403);
  });

  it('GroupRole: member → 404, chưa tham gia → 404, owner → 200', async () => {
    const { tk, sub } = await token();
    expect(await status('/groups/c1/owner', tk)).toBe(404);
    fakeGroupRoles.set(`c1:${sub}`, 'member');
    expect(await status('/groups/c1/owner', tk)).toBe(404);
    fakeGroupRoles.set(`c1:${sub}`, 'owner');
    expect(await status('/groups/c1/owner', tk)).toBe(200);
  });
});
