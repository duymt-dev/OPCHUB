import { afterAll, beforeAll, expect, it } from 'vitest';
import { AuthStateService } from '@/common/auth';
import { STORAGE } from '@/common/integrations';
import { FeeEventsHandler } from '@/modules/membership-fee';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { GuardMatrixModule } from '../common/guard-matrix.controller';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createSocketApp, connected, nextEvent, type SocketTestApp } from '../setup/socket-app';
import { tempStorage, type TempStorage } from '../uploads/storage.helper';

let t: TestApp;
let sockets: SocketTestApp;
let storage: TempStorage;
beforeAll(async () => {
  storage = await tempStorage();
  t = await createTestApp({
    imports: [GuardMatrixModule],
    overrides: [[STORAGE, storage.provider]],
  });
  sockets = await createSocketApp();
  await flushAuthState(t);
});
afterAll(async () => {
  await sockets.close();
  await t.close();
  await storage.dispose();
});

it('AT-GDV01 AT-GDV02 outbox updates Redis, live membership events and REST/socket fee gates', async () => {
  const user = await createUser(t, { fee: 'pending_payment' });
  const token = await tokenOf(t, user);
  const admin = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
  await t.prisma.db.regionalDirector.updateMany({ data: { userId: null } });
  const client = sockets.connectWith({ token, scope: 'membership' });
  expect(await connected(client)).toEqual({ ok: true });
  const publish = async (status: 'regional_director' | 'pending_payment') => {
    const event = nextEvent<{ status: string; validUntil: null }>(client, 'membership.updated');
    await t.app.get(FeeEventsHandler).handle({ userId: user.id, status, validUntil: null });
    expect(await event).toEqual({ status, validUntil: null });
    expect(await t.app.get(AuthStateService).fee(user.id)).toEqual({ status, validUntil: null });
  };
  expect(
    (
      await t.call('/admin/gdv', {
        token: admin,
        method: 'POST',
        json: { region: 'north', userId: user.id },
      })
    ).status,
  ).toBe(200);
  await publish('regional_director');
  expect((await t.call('/guard-matrix/portal', { token })).status).toBe(200);
  const upload = () =>
    t.call('/uploads/presign', {
      method: 'POST',
      token,
      json: { kind: 'chat-image', contentType: 'image/png', size: 1024 },
    });
  expect((await upload()).status).toBe(200);
  expect(await connected(sockets.connect(token))).toEqual({ ok: true });
  expect((await t.call('/admin/gdv/north', { token: admin, method: 'DELETE' })).status).toBe(200);
  await publish('pending_payment');
  expect((await t.call('/guard-matrix/portal', { token })).status).toBe(402);
  expect((await upload()).status).toBe(402);
  expect(await connected(sockets.connect(token))).toEqual({
    ok: false,
    code: 'MEMBERSHIP_REQUIRED',
  });
});
