import type { AccountType, MembershipFeeStatus, SystemRole } from '@opchub/shared';
import { apiErrorSchema } from '@opchub/shared/api';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type AccessClaimsInput,
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
    const claims: AccessClaimsInput = {
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

  describe('Realm (TIP-V2-202, D-62, SEC-R01/R02)', () => {
    const sign = (o: Partial<AccessClaimsInput> = {}) => {
      n += 1;
      return tokens.sign({
        sub: `g-realm-${n}`,
        accountType: 'personal',
        systemRole: 'member',
        permVersion: 1,
        membershipFee: { status: 'active', validUntil: '2027-01-01T00:00:00Z' },
        mustChangePassword: false,
        ...o,
      });
    };
    const admin = (o: Partial<AccessClaimsInput> = {}) =>
      sign({ realm: 'admin', systemRole: 'admin', membershipFee: null, ...o });
    const raw = async (path: string, tk: string) => (await t.call(path, { token: tk })).status;
    const call = async (path: string, tk: string) => {
      const r = await t.call(path, { token: tk });
      const body = r.status >= 400 ? apiErrorSchema.parse(await r.json()).error.code : null;
      return { status: r.status, code: body };
    };

    it('token cũ không có claim realm → member (tương thích ngược)', async () => {
      expect(await raw('/guard-matrix/portal', await sign())).toBe(200);
      expect(await call('/admin/guard-matrix/plain', await sign())).toEqual({
        status: 403,
        code: 'WRONG_PORTAL',
      });
    });

    it('realm admin: /admin/** 200, route Portal 403 WRONG_PORTAL, route dùng chung 200', async () => {
      const tk = await admin();
      expect(await raw('/admin/guard-matrix/plain', tk)).toBe(200);
      expect(await call('/guard-matrix/portal', tk)).toEqual({ status: 403, code: 'WRONG_PORTAL' });
      expect(await raw('/admin/guard-matrix/shared', tk)).toBe(200);
      expect(await raw('/admin/guard-matrix/shared', await sign())).toBe(200);
    });

    it('phiên hạn chế: chỉ route @AdminSetupAllowed', async () => {
      const pwd = await admin({ restricted: 'password' });
      expect(await call('/admin/guard-matrix/plain', pwd)).toEqual({
        status: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
      expect(await raw('/admin/guard-matrix/setup', pwd)).toBe(200);
      const tfa = await admin({ restricted: 'two_factor' });
      expect(await call('/admin/guard-matrix/plain', tfa)).toEqual({
        status: 403,
        code: 'TWO_FACTOR_SETUP_REQUIRED',
      });
    });

    describe('RequireAdmin (TIP-V2-203, §21)', () => {
      const ROLE = 'g-role-test';
      const err = async (path: string, tk: string) => {
        const r = await t.call(`/admin/guard-matrix/${path}`, { token: tk });
        if (r.status < 400) return { status: r.status, code: null, message: null };
        const e = apiErrorSchema.parse(await r.json()).error;
        return { status: r.status, code: e.code, message: e.message };
      };

      it('REQ-327 thiếu thao tác có xem → VIEW_ONLY; thiếu xem → FORBIDDEN', async () => {
        await state.setAdminGrants([{ roleId: ROLE, keys: ['members.view'] }]);
        const tk = await admin({ roleId: ROLE, roleName: 'Giảng viên' });
        expect((await err('members-view', tk)).status).toBe(200);
        expect(await err('members-action', tk)).toEqual({
          status: 403,
          code: 'VIEW_ONLY',
          message: 'Vai trò Giảng viên chỉ có quyền xem mục này',
        });
        expect(await err('settings-admins', tk)).toMatchObject({ status: 403, code: 'FORBIDDEN' });
        // Không có vai trò → không quyền nào
        expect(await err('members-view', await admin())).toMatchObject({ code: 'FORBIDDEN' });
      });

      it('REQ-228 đổi ma trận áp ngay cùng token (không 401)', async () => {
        await state.setAdminGrants([{ roleId: ROLE, keys: ['members.view'] }]);
        const tk = await admin({ roleId: ROLE, roleName: 'Thử' });
        expect((await err('members-action', tk)).code).toBe('VIEW_ONLY');
        await state.setAdminGrants([{ roleId: ROLE, keys: ['members.view', 'members.action'] }]);
        expect((await err('members-action', tk)).status).toBe(200);
        await state.setAdminGrants([{ roleId: ROLE, keys: [] }]);
        expect(await err('members-view', tk)).toMatchObject({ status: 403, code: 'FORBIDDEN' });
      });

      it('REQ-325 super admin luôn qua', async () => {
        const roles = await t.prisma.db.adminRole.findFirstOrThrow({
          where: { key: 'super_admin' },
          select: { id: true },
        });
        const tk = await admin({ roleId: roles.id, roleName: 'Super Admin' });
        for (const p of ['members-view', 'members-action', 'settings-admins']) {
          expect((await err(p, tk)).status).toBe(200);
        }
      });

      it('phiên thành viên trên route RequireAdmin → 403', async () => {
        expect((await err('members-view', await sign())).status).toBe(403);
      });
    });

    it('khoá / version theo realm: khoá admin không ảnh hưởng member cùng id', async () => {
      const id = `g-same-${(n += 1)}`;
      const adm = await admin({ sub: id });
      const mem = await sign({ sub: id });
      await state.setLocked(id, true, 'admin');
      expect(await raw('/admin/guard-matrix/plain', adm)).toBe(403);
      expect(await raw('/guard-matrix/portal', mem)).toBe(200);
      await state.setLocked(id, false, 'admin');
      await state.setPermVersion(id, 5, 'admin');
      expect(await raw('/admin/guard-matrix/plain', adm)).toBe(401);
      expect(await raw('/guard-matrix/portal', mem)).toBe(200);
    });
  });
});
