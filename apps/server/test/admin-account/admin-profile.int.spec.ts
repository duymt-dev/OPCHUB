import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminLoginResponseSchema, adminMeSchema, apiErrorSchema } from '@opchub/shared/api';
import { STORAGE } from '@/common/integrations';
import { AuthStateService } from '@/common/auth';
import { OutboxRelayService } from '@/common/outbox';
import { AdminSessionSyncHandler } from '@/modules/admin-account';
import { AdminSessionProcessor } from '@/worker/processors/admin-session.processor';
import { GC_GRACE_MS, MediaGcService, storageKeyOf } from '@/modules/uploads';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser, flushAuthState, type CreatedUser } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { tempStorage, uploadPng, type TempStorage } from '../uploads/storage.helper';
import { cleanupAdminAccounts } from './helpers';

describe('TIP-V46-822 REQ-322 REQ-323 REQ-351 RB-R02/RB-R03 Admin self profile and SEC-R01 password', () => {
  let t: TestApp;
  let store: TempStorage;
  let user: CreatedUser;
  let token: string;
  const patch = (json: unknown, accessToken = token) =>
    t.call('/admin/auth/me', { method: 'PATCH', json, token: accessToken });
  const change = (json: unknown, accessToken = token) =>
    t.call('/admin/auth/change-password', { method: 'POST', json, token: accessToken });
  const passwordBody = (currentPassword: string, newPassword = '<NewPass823>') => ({
    currentPassword,
    newPassword,
    confirmPassword: newPassword,
  });
  const cookie = (response: Response) =>
    response.headers
      .getSetCookie()
      .find((value) => value.startsWith('opchub_art='))
      ?.split(';')[0] ?? '';
  const login = () =>
    t.call('/admin/auth/login', {
      method: 'POST',
      json: { identifier: user.email, password: user.password },
    });

  beforeAll(async () => {
    store = await tempStorage();
    t = await createTestApp({
      providers: [AdminSessionProcessor],
      overrides: [[STORAGE, store.provider]],
    });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    // No menu grants: self-service must not require settings.action / overview.view.
    user = await createUser(t, { adminPermissions: [] });
    token = await tokenOf(t, user);
  });
  afterAll(async () => {
    await cleanupAdminAccounts(t);
    await t.close();
    await store.dispose();
  });

  it('AC-01/02 only self, persisted fields, audit and unchanged identity/role', async () => {
    const other = await createUser(t, { systemRole: 'admin' });
    const result = await patch({ name: 'Trần Quản Trị', phone: '0901234567' });
    expect(result.status).toBe(200);
    const me = adminMeSchema.parse(await result.json());
    expect(me).toMatchObject({
      id: user.id,
      name: 'Trần Quản Trị',
      email: user.email,
      phone: '0901234567',
    });
    expect(adminMeSchema.parse(await (await t.call('/admin/auth/me', { token })).json())).toEqual(
      me,
    );
    expect(
      (await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: other.id } })).name,
    ).not.toBe(me.name);
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: user.id, action: 'admin_account.update_profile' },
      }),
    ).toBe(1);
    expect((await patch({ name: 'Trần Quản Trị', phone: '' })).status).toBe(200);
    expect(
      (await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: user.id } })).phone,
    ).toBeNull();
  });

  it('AC-02 security negatives: token/realm/setup/locked/deleted and fields/413', async () => {
    expect((await patch({ name: 'Name' }, '')).status).toBe(401);
    expect((await change(passwordBody(user.password), '')).status).toBe(401);
    const member = await tokenOf(t, await createUser(t));
    expect((await patch({ name: 'Name' }, member)).status).toBe(403);
    expect((await change(passwordBody(user.password), member)).status).toBe(403);
    for (const body of [
      { name: 'x' },
      { name: 'Name', email: 'fake@a.vn' },
      { name: 'Name', roleId: 'root' },
      { name: 'Name', id: user.id },
    ]) {
      const response = await patch(body);
      expect(response.status).toBe(400);
      expect(apiErrorSchema.parse(await response.json()).error.fields?.length).toBeGreaterThan(0);
    }
    expect((await patch({ name: 'x'.repeat(800_000) })).status).toBe(413);
    expect((await change({ currentPassword: 'x'.repeat(800_000) })).status).toBe(413);
    await t.prisma.db.adminUser.update({ where: { id: user.id }, data: { mustChangePwd: true } });
    const restricted = await tokenOf(t, user);
    expect((await patch({ name: 'Name' }, restricted)).status).toBe(403);
    expect((await change(passwordBody(user.password), restricted)).status).toBe(403);
    // An already-issued full token cannot bypass a newly required first-password state.
    expect((await change(passwordBody(user.password))).status).toBe(409);
    await t.prisma.db.adminUser.update({ where: { id: user.id }, data: { status: 'locked' } });
    expect((await patch({ name: 'Name' })).status).toBe(403);
    await t.prisma.db.adminUser.update({
      where: { id: user.id },
      data: { deletedAt: new Date(), status: 'active' },
    });
    expect((await patch({ name: 'Name' })).status).toBe(401);
  });

  it('AC-03/06 presign upload, GC protection, replacement and removal in storage_gc', async () => {
    const first = await uploadPng(t, token, 'avatar');
    expect((await patch({ name: 'Avatar Admin', avatarUrl: first })).status).toBe(200);
    const key = storageKeyOf(first, store.provider.publicUrl('')) ?? '';
    await t.prisma.db.storageGc.upsert({
      where: { key },
      create: { key, reason: 'test' },
      update: {},
    });
    await t.app.get(MediaGcService).sweep(new Date(Date.now() + GC_GRACE_MS + 1000));
    expect(await store.provider.head(key)).not.toBeNull();
    expect(await t.prisma.db.storageGc.findUnique({ where: { key } })).toBeNull();
    const next = await uploadPng(t, token, 'avatar');
    expect((await patch({ name: 'Avatar Admin', avatarUrl: next })).status).toBe(200);
    expect(await t.prisma.db.storageGc.findUnique({ where: { key } })).toMatchObject({
      reason: 'admin-avatar-replaced',
    });
    expect((await patch({ name: 'Avatar Admin', avatarUrl: null })).status).toBe(200);
    expect(
      (await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: user.id } })).avatarUrl,
    ).toBeNull();
    await t.app.get(MediaGcService).sweep(new Date(Date.now() + GC_GRACE_MS + 2000));
    expect(await store.provider.head(key)).toBeNull();
  });

  it('AC-03 rejects foreign/external/missing/bad MIME/oversized avatar', async () => {
    const foreign = await uploadPng(
      t,
      await tokenOf(t, await createUser(t, { systemRole: 'admin' })),
      'avatar',
    );
    const badKey = `avatar/${user.id}/bad.png`;
    const hugeKey = `avatar/${user.id}/huge.png`;
    await store.provider.put(badKey, 'not an image', 'text/plain');
    await store.provider.put(hugeKey, Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png');
    for (const avatarUrl of [
      foreign,
      'https://other.test/a.png',
      store.provider.publicUrl(`avatar/${user.id}/missing.png`),
      store.provider.publicUrl(badKey),
      store.provider.publicUrl(hugeKey),
    ]) {
      const response = await patch({ name: 'Avatar Admin', avatarUrl });
      expect(response.status).toBe(400);
      expect(apiErrorSchema.parse(await response.json()).error.fields?.[0]?.path).toBe('avatarUrl');
    }
  });

  it('AC-04 SEC-R01 new hash/version/session; both old refresh chains and access tokens revoked, durable relay idempotent', async () => {
    const first = await login();
    const second = await login();
    const old = adminLoginResponseSchema.parse(await first.json());
    const before = await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: user.id } });
    const response = await change(passwordBody(user.password));
    expect(response.status).toBe(200);
    const fresh = adminLoginResponseSchema.parse(await response.json());
    expect(cookie(response)).toBeTruthy();
    expect(cookie(response)).not.toBe(cookie(first));
    expect((await t.call('/admin/auth/me', { token: fresh.accessToken })).status).toBe(200);
    expect((await t.call('/admin/auth/me', { token: old.accessToken })).status).toBe(401);
    for (const previous of [first, second]) {
      expect(
        (
          await t.call('/admin/auth/refresh', {
            method: 'POST',
            headers: { Origin: 'http://localhost:3001', Cookie: cookie(previous) },
          })
        ).status,
      ).toBe(401);
    }
    expect(
      (
        await t.call('/admin/auth/refresh', {
          method: 'POST',
          headers: { Origin: 'http://localhost:3001', Cookie: cookie(response) },
        })
      ).status,
    ).toBe(200);
    const after = await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.permVersion).toBe(before.permVersion + 1);
    expect(after.passwordHash).toMatch(/^\$argon2id\$/);
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect((await login()).status).toBe(401);
    expect(
      (
        await t.call('/admin/auth/login', {
          method: 'POST',
          json: { identifier: user.email, password: '<NewPass823>' },
        })
      ).status,
    ).toBe(200);
    const audit = await t.prisma.db.auditLog.findMany({
      where: { actorId: user.id, action: 'admin_account.change_password' },
    });
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toContain('NewPass823');
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'admin.session_changed', payload: { path: ['adminId'], equals: user.id } },
    });
    expect(event.dispatchedAt).toBeNull();
    await t.app.get(AuthStateService).setPermVersion(user.id, before.permVersion, 'admin');
    await t.app.get(OutboxRelayService).relayOnce();
    expect(await t.app.get(AuthStateService).permVersion(user.id, 'admin')).toBe(after.permVersion);
    await t.app.get(AdminSessionSyncHandler).sync({ adminId: user.id });
    expect(await t.app.get(AuthStateService).permVersion(user.id, 'admin')).toBe(after.permVersion);
    expect(
      (await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).dispatchedAt,
    ).not.toBeNull();
  });

  it('AC-04 durable concurrent replay never lowers Redis security version', async () => {
    const state = t.app.get(AuthStateService);
    await state.setPermVersion(user.id, 7, 'admin');
    await t.app.get(AdminSessionSyncHandler).sync({ adminId: user.id });
    expect(await state.permVersion(user.id, 'admin')).toBe(7);
    await state.setPermVersionAtLeast(user.id, 9, 'admin');
    expect(await state.permVersion(user.id, 'admin')).toBe(9);
  });

  it.each([
    [
      'wrong current',
      { currentPassword: 'wrongPass1', newPassword: 'NewPass2', confirmPassword: 'NewPass2' },
      'currentPassword',
    ],
    [
      'weak',
      { currentPassword: 'Test@2026pass', newPassword: 'weak', confirmPassword: 'weak' },
      'newPassword',
    ],
    [
      'same',
      {
        currentPassword: 'Test@2026pass',
        newPassword: 'Test@2026pass',
        confirmPassword: 'Test@2026pass',
      },
      'newPassword',
    ],
    [
      'mismatch',
      { currentPassword: 'Test@2026pass', newPassword: 'NewPass2', confirmPassword: 'OtherPass3' },
      'confirmPassword',
    ],
  ])('AC-05 SEC-R01 rejects %s at field; no write/audit', async (_name, body, field) => {
    const before = await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: user.id } });
    const response = await change(body);
    expect(response.status).toBe(400);
    expect(
      apiErrorSchema.parse(await response.json()).error.fields?.some((f) => f.path === field),
    ).toBe(true);
    expect(
      (await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: user.id } })).passwordHash,
    ).toBe(before.passwordHash);
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: user.id, action: 'admin_account.change_password' },
      }),
    ).toBe(0);
  });

  it('AC-05 password endpoint limits five requests per minute', async () => {
    for (let i = 0; i < 5; i++) expect((await change(passwordBody('WrongPass1'))).status).toBe(400);
    expect((await change(passwordBody('WrongPass1'))).status).toBe(429);
  });
});
