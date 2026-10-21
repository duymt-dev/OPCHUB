import { BotRunnerService } from '@/modules/bot';
import {
  botActivityListSchema,
  botSettingsSchema,
  botThreadListSchema,
  personaSchema,
  scriptRunSchema,
  scriptSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** B45: bot qua cờ FEATURE_BOTS (bật trong .env dev/test) — D-04 luôn duyệt, D-48, S-11 */
describe('Bot tương tác (B45)', () => {
  let t: TestApp;
  let mod: string;
  const personaIds: string[] = [];
  const scriptIds: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    mod = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] }));
  });
  afterAll(async () => {
    await t.prisma.db.botScript.deleteMany({ where: { id: { in: scriptIds } } });
    await t.prisma.db.message.deleteMany({ where: { personaId: { in: personaIds } } });
    await t.prisma.db.persona.deleteMany({ where: { id: { in: personaIds } } });
    await t.close();
  });

  const persona = async (name: string) => {
    const r = await t.call('/admin/personas', {
      method: 'POST',
      token: mod,
      json: { name, title: 'Chủ shop', province: 'Hà Nội', tone: 'thân thiện', color: '#13C2C2' },
    });
    expect(r.status).toBe(201);
    const p = personaSchema.parse(await r.json());
    personaIds.push(p.id);
    return p;
  };

  it('persona and script CRUD preserve identifiers, not-found handling and moderation audit', async () => {
    const p = await persona('Lan Bot');
    expect(p.id).toMatch(/^ps\d+$/);
    const up = await t.call(`/admin/personas/${p.id}`, {
      method: 'PATCH',
      token: mod,
      json: { name: 'Lan Bot 2', title: 'x', province: 'y', tone: 'z' },
    });
    expect(personaSchema.parse(await up.json()).name).toBe('Lan Bot 2');
    const g = await createGroup(t);
    const s = await t.call('/admin/scripts', {
      method: 'POST',
      token: mod,
      json: { topic: 'Chào hỏi', groupIds: [g.id], lines: [{ personaId: p.id, body: 'Xin chào' }] },
    });
    expect(s.status).toBe(201);
    const sc = scriptSchema.parse(await s.json());
    scriptIds.push(sc.id);
    expect(sc.id).toMatch(/^sc\d+$/);
    const log = await t.prisma.db.auditLog.findFirst({
      where: { action: 'persona.update', entityId: p.id },
      select: { tag: true },
    });
    expect(log?.tag).toBe('moderation');
    expect(
      (await t.call('/admin/personas/khong-co', { method: 'DELETE', token: mod })).status,
    ).toBe(404);
  });

  it('REQ-208 run schedules individual turns; public identity stays indistinguishable; replay is inert', async () => {
    const [a, b] = await Promise.all([persona('An Bot'), persona('Bình Bot')]);
    const g = await createGroup(t);
    const member = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, member.id);
    const sc = scriptSchema.parse(
      await (
        await t.call('/admin/scripts', {
          method: 'POST',
          token: mod,
          json: {
            topic: 'Tìm nhà cung cấp',
            groupIds: [g.id],
            lines: [
              { personaId: a.id, body: 'Ai biết xưởng in bao bì?' },
              { personaId: b.id, body: 'Mình biết một chỗ ở Bắc Ninh' },
            ],
          },
        })
      ).json(),
    );
    scriptIds.push(sc.id);
    const run = await t.call(`/admin/scripts/${sc.id}/run`, { method: 'POST', token: mod });
    expect(run.status).toBe(202);
    const { threadId, status } = scriptRunSchema.parse(await run.json());
    expect(status).toBe('scheduled');
    const list = botThreadListSchema.parse(
      await (await t.call('/admin/bot/threads', { token: mod })).json(),
    );
    const th = list.items.find((x) => x.id === threadId);
    expect(th?.lines.map((l) => l.name)).toEqual(['An Bot', 'Bình Bot']);

    await t.prisma.db.persona.updateMany({
      where: { id: { in: [a.id, b.id] } },
      data: { groupIds: [g.id], activeHours: '00:00 - 24:00', postsPerDay: 20 },
    });
    const runner = t.app.get(BotRunnerService);
    // Integration files share the database; previous injected-clock fixtures may be ahead.
    // Preserve the newest-first API assertion by placing this execution after existing history.
    const latest = await t.prisma.db.botActivity.aggregate({ _max: { createdAt: true } });
    const now = new Date(Math.max(Date.now(), (latest._max.createdAt?.getTime() ?? 0) + 1));
    expect(await runner.postTurn(threadId, 0, now, () => 0)).toBe(true);
    const running = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: threadId } });
    expect(running.status).toBe('running');
    expect(running.cursor).toBe(1);
    expect(await t.prisma.db.message.count({ where: { personaId: { in: [a.id, b.id] } } })).toBe(1);
    expect(running.nextAt!.getTime() - now.getTime()).toBe(300_000);
    expect(await runner.postTurn(threadId, 1, running.nextAt!, () => 0)).toBe(true);
    const done = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: threadId } });
    expect(done).toMatchObject({ status: 'done', cursor: 2, nextAt: null });
    expect(await runner.postTurn(threadId, 1, running.nextAt!, () => 0)).toBe(false);
    expect(
      (await t.call(`/admin/bot/threads/${threadId}/approve`, { method: 'POST', token: mod }))
        .status,
    ).toBe(404);
    expect(
      (await t.call(`/admin/bot/threads/${threadId}`, { method: 'DELETE', token: mod })).status,
    ).toBe(404);
    expect(
      (await t.call(`/admin/bot/threads/${threadId}/stop`, { method: 'POST', token: mod })).status,
    ).toBe(409);

    const room = await t.prisma.db.room.findFirstOrThrow({
      where: { groupId: g.id, isDefault: true },
    });
    const db = await t.prisma.db.message.findMany({
      where: { roomId: room.id },
      select: { senderId: true, personaId: true, isSimulated: true },
    });
    expect(db).toHaveLength(2);
    expect(db.every((m) => m.senderId === null && m.isSimulated && m.personaId)).toBe(true);

    const memTk = await tokenOf(t, member);
    const raw = await (await t.call(`/rooms/${room.id}/messages?size=10`, { token: memTk })).text();
    expect(raw).not.toContain('isSimulated');
    const page = JSON.parse(raw) as {
      items: { sender: { name: string }; senderRole: string | null }[];
    };
    expect(page.items.map((m) => m.sender.name).sort()).toEqual(['An Bot', 'Bình Bot']);
    expect(page.items.every((m) => m.senderRole === null)).toBe(true);

    const act = botActivityListSchema.parse(
      await (await t.call('/admin/bot/activity', { token: mod })).json(),
    );
    expect(act.items[0]?.text).toContain('Tìm nhà cung cấp');
    expect(act.todayCount).toBeGreaterThanOrEqual(2);
    const pc = await t.prisma.db.persona.findUniqueOrThrow({
      where: { id: a.id },
      select: { postCount: true },
    });
    expect(pc.postCount).toBe(1);
  });

  it('REQ-208 stop retains terminal history and script deletion cascades threads', async () => {
    const p = await persona('Cúc Bot');
    const g = await createGroup(t);
    const sc = scriptSchema.parse(
      await (
        await t.call('/admin/scripts', {
          method: 'POST',
          token: mod,
          json: { topic: 'Bỏ thử', groupIds: [g.id], lines: [{ personaId: p.id, body: 'a' }] },
        })
      ).json(),
    );
    const r1 = scriptRunSchema.parse(
      await (await t.call(`/admin/scripts/${sc.id}/run`, { method: 'POST', token: mod })).json(),
    );
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view'] }));
    const denied = await t.call(`/admin/bot/threads/${r1.threadId}/stop`, {
      method: 'POST',
      token: viewer,
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: { code: 'VIEW_ONLY' } });
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: r1.threadId } })).status,
    ).toBe('scheduled');
    expect(
      (await t.call(`/admin/bot/threads/${r1.threadId}/stop`, { method: 'POST', token: mod }))
        .status,
    ).toBe(200);
    expect(
      await t.prisma.db.auditLog.findFirst({
        where: { action: 'bot_thread.stop', entityId: r1.threadId },
        select: { tag: true },
      }),
    ).toMatchObject({ tag: 'moderation' });
    const r2 = scriptRunSchema.parse(
      await (await t.call(`/admin/scripts/${sc.id}/run`, { method: 'POST', token: mod })).json(),
    );
    expect((await t.call(`/admin/scripts/${sc.id}`, { method: 'DELETE', token: mod })).status).toBe(
      200,
    );
    expect(await t.prisma.db.botThread.count({ where: { id: r2.threadId } })).toBe(0);
  });

  it('settings patch preserves other fields, removes requireReview and enforces permissions', async () => {
    const s = botSettingsSchema.parse(
      await (await t.call('/admin/bot/settings', { token: mod })).json(),
    );
    const p = await t.call('/admin/bot/settings', {
      method: 'PATCH',
      token: mod,
      json: { delayMinutes: s.delayMinutes === 7 ? 8 : 7 },
    });
    const updated = await p.json();
    expect(botSettingsSchema.parse(updated).enabled).toBe(s.enabled);
    expect(updated).not.toHaveProperty('requireReview');
    expect(botSettingsSchema.parse(updated).delayMinutes).toBe(s.delayMinutes === 7 ? 8 : 7);
    await t.call('/admin/bot/settings', {
      method: 'PATCH',
      token: mod,
      json: { delayMinutes: s.delayMinutes },
    });
    const m = await tokenOf(t, await createUser(t));
    expect((await t.call('/admin/personas', { token: m })).status).toBe(403);
  });
});
