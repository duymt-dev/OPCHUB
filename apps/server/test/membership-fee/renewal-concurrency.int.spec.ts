import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { apiErrorSchema } from '@opchub/shared/api';
import { DEFAULT_RENEWAL, type renewalSettingsSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { AppSettingsService } from '@/modules/settings';
import { RenewalDeliveryService } from '@/modules/membership-fee/services/renewal-delivery.service';
import { createUser } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let t: TestApp;
const users: string[] = [];
let original: ReturnType<typeof renewalSettingsSchema.parse>;
beforeAll(async () => {
  t = await createTestApp();
  original = await t.app.get(AppSettingsService).renewal();
  await t.prisma.db.appSetting.update({
    where: { key: 'renewal' },
    data: { value: DEFAULT_RENEWAL },
  });
  await t.app.get(AppSettingsService).invalidate('renewal');
});
afterAll(async () => {
  vi.restoreAllMocks();
  await t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
  await t.prisma.db.appSetting.update({ where: { key: 'renewal' }, data: { value: original } });
  await t.app.get(AppSettingsService).invalidate('renewal');
  await t.close();
});

it('A11 overlapping manual sends', async () => {
  const admins = await Promise.all([
    createUser(t, { systemRole: 'admin' }),
    createUser(t, { systemRole: 'admin' }),
  ]);
  const tokens = await Promise.all(admins.map((a) => tokenOf(t, a)));
  const recipients: { id: string; email: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const u = await createUser(t, { fee: 'active' });
    recipients.push(u);
    users.push(u.id);
  }
  const ids = recipients.map((u) => u.id);
  await t.prisma.db.membershipFee.updateMany({
    where: { userId: { in: ids } },
    data: {
      validUntil: new Date(Date.now() + 7 * 86_400_000),
    },
  });
  const delivery = t.app.get(RenewalDeliveryService);
  const actual = delivery.deliver.bind(delivery);
  let release = () => {};
  let entered = () => {};
  const hold = new Promise<void>((done) => {
    release = done;
  });
  const ready = new Promise<void>((done) => {
    entered = done;
  });
  const spy = vi.spyOn(delivery, 'deliver').mockImplementationOnce(async (...args) => {
    entered();
    await hold;
    return actual(...args);
  });
  const beforeEvents = await t.prisma.db.outboxEvent.findMany({
    where: { type: 'membership_fee.reminded' },
    select: { id: true },
  });
  const request = (token: string | undefined) =>
    t.call('/admin/renewal/send', {
      method: 'POST',
      ...(token ? { token } : {}),
      json: { userIds: ids },
    });
  const first = request(tokens[0]);
  try {
    await ready;
    const second = await request(tokens[1]);
    expect(second.status).toBe(409);
    expect(apiErrorSchema.parse(await second.json()).error).toMatchObject({
      code: 'RENEWAL_SEND_BUSY',
      message: 'Đang gửi nhắc gia hạn, vui lòng thử lại sau',
    });
  } finally {
    release();
  }
  expect((await first).status).toBe(200);
  spy.mockRestore();
  const emailCount = () =>
    t.prisma.db.mailLog.count({
      where: {
        kind: 'fee_reminder',
        to: { in: recipients.map((u) => u.email) },
      },
    });
  const auditCount = () =>
    t.prisma.db.auditLog.count({
      where: {
        actorId: { in: admins.map((a) => a.id) },
        action: 'fee.renewal_send',
      },
    });
  const events = () =>
    t.prisma.db.outboxEvent.findMany({
      where: {
        type: 'membership_fee.reminded',
        id: { notIn: beforeEvents.map((e) => e.id) },
      },
    });
  expect(await emailCount()).toBe(30);
  expect(await auditCount()).toBe(1);
  const batch = await events();
  expect(batch).toHaveLength(1);
  expect(
    new Set(
      parseOutboxPayload('membership_fee.reminded', batch[0]?.payload).items.map((i) => i.userId),
    ),
  ).toEqual(new Set(ids));
  expect(await t.prisma.db.feeReminder.count({ where: { userId: { in: ids } } })).toBe(30);
  expect((await request(tokens[1])).status).toBe(200);
  expect(await emailCount()).toBe(60);
  expect(await auditCount()).toBe(2);
  expect(await events()).toHaveLength(2);
  expect(await t.prisma.db.feeReminder.count({ where: { userId: { in: ids } } })).toBe(30);
});
