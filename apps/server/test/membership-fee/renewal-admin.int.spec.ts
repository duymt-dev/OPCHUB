import { readFileSync } from 'node:fs';
import { apiErrorSchema } from '@opchub/shared/api';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RENEWAL,
  renewalListSchema,
  renewalSettingsSchema,
  renewalQuerySchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { AuditService } from '@/common/audit';
import { AppSettingsService } from '@/modules/settings';
import { FeeSchedulerService } from '@/modules/membership-fee';
import { NotificationEventsHandler } from '@/modules/notification';
import { RenewalService } from '@/modules/membership-fee/services/renewal.service';
import { createUser, flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const NOW = new Date('2099-12-01T01:00:00Z');
const DAY = 86_400_000;
describe('REQ-620 BR-471–474 Admin renewal', () => {
  const created: string[] = [];
  let t: TestApp, service: RenewalService, token: string, actor: { id: string; ip: null };
  beforeAll(async () => {
    t = await createTestApp();
    service = t.app.get(RenewalService);
    const admin = await createUser(t, { systemRole: 'admin' });
    actor = { id: admin.id, ip: null };
    token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
  });
  afterAll(async () => {
    await reset();
    await t.close();
  });
  const reset = async () => {
    await t.prisma.db.appSetting.upsert({
      where: { key: 'renewal' },
      create: { key: 'renewal', value: DEFAULT_RENEWAL },
      update: { value: DEFAULT_RENEWAL },
    });
    await t.app.get(AppSettingsService).invalidate('renewal');
  };
  beforeEach(async () => {
    vi.restoreAllMocks();
    await flushAuthState(t);
    await reset();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await t.prisma.db.user.deleteMany({ where: { id: { in: created.splice(0) } } });
  });
  async function member(days: number, spec: Parameters<typeof createUser>[1] = { fee: 'active' }) {
    const u = await createUser(t, spec);
    created.push(u.id);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: new Date(NOW.getTime() + days * DAY) },
    });
    return u;
  }
  const reminders = (id: string) =>
    t.prisma.db.feeReminder.findMany({
      where: { userId: id },
      select: { milestone: true, sentAt: true },
    });
  const mails = (email: string) =>
    t.prisma.db.mailLog.findMany({
      where: { to: email, kind: 'fee_reminder' },
      select: { bodyHtml: true, subject: true },
    });

  it('settings audit and permission: nested patch persists, response parses, cache invalidated', async () => {
    const r = await t.call('/admin/settings/renewal', {
      method: 'PATCH',
      token,
      json: { milestones: { d30: false } },
    });
    expect(r.status).toBe(200);
    const saved = renewalSettingsSchema.parse(await r.json());
    expect(saved).toEqual({ ...DEFAULT_RENEWAL, milestones: { d30: false, d7: true, d1: true } });
    expect(await (await t.call('/admin/settings/renewal', { token })).json()).toEqual(saved);
    const log = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { actorId: actor.id, action: 'settings.renewal' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log.diff).toMatchObject({ before: DEFAULT_RENEWAL, after: saved });
    await Promise.all([
      service.patch(actor, { channels: { email: false } }),
      service.patch(actor, { milestones: { d7: false } }),
    ]);
    const current = await service.config();
    expect(current.channels.email).toBe(false);
    expect(current.milestones.d7).toBe(false);
  });
  it('settings audit failure rolls back persisted configuration', async () => {
    vi.spyOn(t.app.get(AuditService), 'log').mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(service.patch(actor, { milestones: { d7: false } })).rejects.toThrow(
      'audit unavailable',
    );
    expect(await service.config()).toEqual(DEFAULT_RENEWAL);
  });
  it('permission: all four routes reject non-privileged admin; missing token rejected', async () => {
    const a = await createUser(t, { adminPermissions: ['members.view'] });
    const denied = tokenBodySchema.parse(await (await loginOf(t, a)).json()).accessToken;
    for (const [path, method, json] of [
      ['/admin/settings/renewal', 'GET', undefined],
      ['/admin/settings/renewal', 'PATCH', {}],
      ['/admin/renewal/members', 'GET', undefined],
      ['/admin/renewal/send', 'POST', { all: true }],
    ] as const) {
      expect(
        (await t.call(path, { method, token: denied, ...(json ? { json } : {}) })).status,
      ).toBe(403);
    }
    expect((await t.call('/admin/settings/renewal')).status).toBe(401);
  });
  it('validation: unknown keys, duplicate/empty/oversized selection, bad cursor and bodies', async () => {
    for (const body of [
      { userIds: [] },
      { userIds: ['x', 'x'] },
      { userIds: [''] },
      { all: true, userIds: ['x'] },
      { userIds: Array.from({ length: 501 }, (_, i) => String(i)) },
    ]) {
      const r = await t.call('/admin/renewal/send', { method: 'POST', token, json: body });
      expect(r.status).toBe(400);
      const error = apiErrorSchema.parse(await r.json());
      expect(error.error.code).toBe('VALIDATION_ERROR');
      expect(error.error.fields?.length).toBeGreaterThan(0);
    }
    expect(
      (
        await t.call('/admin/settings/renewal', {
          method: 'PATCH',
          token,
          json: { channels: { zalo: true } },
        })
      ).status,
    ).toBe(400);
    expect((await t.call('/admin/renewal/members?cursor=no', { token })).status).toBe(400);
    for (const path of ['/admin/renewal/send', '/admin/settings/renewal']) {
      expect(
        (
          await t.call(path, {
            method: path.endsWith('send') ? 'POST' : 'PATCH',
            token,
            json: { padding: 'x'.repeat(800_000) },
          })
        ).status,
      ).toBe(413);
    }
  });
  it('no channel: save all off, API returns 422, no manual claims; manual ignores disabled milestones', async () => {
    const u = await member(12);
    await service.patch(actor, { channels: { email: false, app: false } });
    const r = await t.call('/admin/renewal/send', { method: 'POST', token, json: { all: true } });
    expect(r.status).toBe(422);
    expect(await r.json()).toMatchObject({
      error: { code: 'RENEWAL_NO_CHANNEL', message: 'Bật ít nhất 1 kênh gửi' },
    });
    expect(await reminders(u.id)).toHaveLength(0);
    await service.patch(actor, {
      channels: { email: true, app: false },
      milestones: { d30: false, d7: false, d1: false },
    });
    expect(await service.send(actor, { userIds: [u.id] }, NOW)).toEqual({
      sent: 1,
      channels: ['email'],
    });
  });
  it('list audience excludes directors, pending, expired, investor, locked, deleted, outside window', async () => {
    const good = await member(12),
      trial = await member(30, { fee: 'trial' });
    const bad: Awaited<ReturnType<typeof createUser>>[] = [];
    for (const fee of ['regional_director', 'pending_payment', 'expired'] as const)
      bad.push(await member(12, { fee }));
    bad.push(
      await member(12, { fee: 'active', accountType: 'investor' }),
      await member(12, { fee: 'active', status: 'locked' }),
      await member(0),
      await member(31),
    );
    const deleted = await member(12);
    await t.prisma.db.user.update({ where: { id: deleted.id }, data: { deletedAt: NOW } });
    bad.push(deleted);
    const page = renewalListSchema.parse(await service.list({ limit: 100 }, NOW));
    expect(page.items.map((r) => r.userId)).toEqual(expect.arrayContaining([good.id, trial.id]));
    expect(page.items.some((r) => bad.some((b) => b.id === r.userId))).toBe(false);
    expect((await service.send(actor, { userIds: bad.map((u) => u.id) }, NOW)).sent).toBe(0);
  });
  it('manual send: repeated same VN day updates last sent, mail + notification + audit; D7 remains independent', async () => {
    const u = await member(12);
    expect((await service.send(actor, { userIds: [u.id, 'unknown'] }, NOW)).sent).toBe(1);
    const later = new Date(NOW.getTime() + 2000);
    await service.send(actor, { userIds: [u.id] }, later);
    expect(await reminders(u.id)).toEqual([{ milestone: 'M:2099-12-01', sentAt: later }]);
    expect(await mails(u.email)).toHaveLength(2);
    const row = (await service.list({ limit: 100 }, NOW)).items.find((r) => r.userId === u.id);
    expect(row?.lastSentAt).toBe(later.toISOString());
    const events = await t.prisma.db.outboxEvent.findMany({
      where: { type: 'membership_fee.reminded' },
      select: { payload: true },
    });
    const mine = events
      .flatMap((e) => parseOutboxPayload('membership_fee.reminded', e.payload).items)
      .filter((i) => i.userId === u.id);
    expect(mine).toHaveLength(2);
    expect(mine[0]?.title).toBe('Gói thành viên sắp hết hạn');
    await t.app.get(NotificationEventsHandler).feeReminded({ items: mine.slice(0, 1) });
    expect(
      await t.prisma.db.notification.findFirst({ where: { userId: u.id, type: 'membership' } }),
    ).toMatchObject({ title: 'Gói thành viên sắp hết hạn', link: '/membership/pay' });
    await t.app.get(FeeSchedulerService).remind(new Date(NOW.getTime() + 5 * DAY));
    expect((await reminders(u.id)).map((r) => r.milestone)).toContain('D7');
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: actor.id, action: 'fee.renewal_send' },
      }),
    ).toBeGreaterThanOrEqual(2);
  });
  it('manual send rollback: audit failure leaves no mail, outbox or reminder', async () => {
    const u = await member(12);
    vi.spyOn(t.app.get(AuditService), 'log').mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(service.send(actor, { userIds: [u.id] }, NOW)).rejects.toThrow(
      'audit unavailable',
    );
    expect(await reminders(u.id)).toHaveLength(0);
    expect(await mails(u.email)).toHaveLength(0);
    const events = await t.prisma.db.outboxEvent.findMany({
      where: { type: 'membership_fee.reminded' },
      select: { payload: true },
    });
    expect(
      events
        .flatMap((e) => parseOutboxPayload('membership_fee.reminded', e.payload).items)
        .some((i) => i.userId === u.id),
    ).toBe(false);
  });
  it('send all: 25 valid members, one transaction audit, paged list keyset with 45 rows', async () => {
    const now = new Date('2101-06-01T01:00:00Z');
    const ids = [];
    for (let i = 0; i < 45; i++) {
      const u = await member(12);
      ids.push(u.id);
      await t.prisma.db.membershipFee.update({
        where: { userId: u.id },
        data: { validUntil: new Date(now.getTime() + (i < 25 ? 10 : 40) * DAY) },
      });
    }
    expect(await service.send(actor, { all: true }, now)).toEqual({
      sent: 25,
      channels: ['email', 'app'],
    });
    await t.prisma.db.membershipFee.updateMany({
      where: { userId: { in: ids } },
      data: { validUntil: new Date(now.getTime() + 10 * DAY) },
    });
    const first = await service.list({ limit: 20 }, now),
      second = await service.list(
        renewalQuerySchema.parse({ limit: 20, cursor: first.nextCursor }),
        now,
      );
    const third = await service.list(
      renewalQuerySchema.parse({ limit: 20, cursor: second.nextCursor }),
      now,
    );
    expect(first.total).toBe(45);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(20);
    expect(third.items).toHaveLength(5);
    expect(
      new Set([...first.items, ...second.items, ...third.items].map((r) => r.userId)).size,
    ).toBe(45);
    expect(third.nextCursor).toBeNull();
  });
  it('milestone migration: legacy T-7 preserved as D7 without replay; T+3 historical marker remains', async () => {
    const u = await member(7);
    const until = new Date(NOW.getTime() + 7 * DAY);
    await t.prisma.db.feeReminder.createMany({
      data: [
        { userId: u.id, validUntil: until, milestone: 'T-7' },
        { userId: u.id, validUntil: until, milestone: 'T+3' },
      ],
    });
    const sql = readFileSync(
      new URL(
        '../../../../packages/db/prisma/migrations/20261108090000_v46_renewal_reminders/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ).split('INSERT INTO app_settings')[0]!;
    // Static reviewed migration statements, never constructed from HTTP/test input.
    for (const statement of sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean))
      await t.prisma.db.$executeRawUnsafe(statement);
    await t.app.get(FeeSchedulerService).remind(NOW);
    expect((await reminders(u.id)).map((r) => r.milestone).sort()).toEqual(['D7', 'T+3']);
    expect(await mails(u.email)).toHaveLength(0);
  });
});
