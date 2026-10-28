import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BotAdmissionService } from '@/modules/bot';
import { createTestApp, type TestApp } from '../setup/test-app';
import { rotationFixtures } from './rotation-fixture';

describe('D-112 durable per-group script rotation', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof rotationFixtures>;
  const now = new Date('2026-10-29T05:00:00Z');
  const due = async () => {
    const count = await t.app.get(BotAdmissionService).due(now);
    await fixture.capture();
    return count;
  };
  const active = (groupId: string) =>
    t.prisma.db.botThread.findFirstOrThrow({
      where: { groupIds: { has: groupId }, status: { in: ['scheduled', 'running'] } },
    });
  beforeAll(async () => {
    t = await createTestApp();
    fixture = rotationFixtures(t);
    await fixture.start();
  });
  beforeEach(async () => {
    await fixture.clear();
  });
  afterAll(async () => {
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'bot_schedule' } });
    await fixture.close();
    await t.close();
  });

  it('admits one independent thread per free group and serializes racing ticks with transactional outbox', async () => {
    const a = await fixture.group();
    const b = await fixture.group();
    const script = await fixture.script([a.group.id, b.group.id], a.persona.id);
    expect((await Promise.all([due(), due()])).sort()).toEqual([0, 2]);
    const rows = await t.prisma.db.botThread.findMany({ where: { scriptId: script.id } });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.groupIds[0]).sort()).toEqual([a.group.id, b.group.id].sort());
    expect(
      rows.every(
        (row) => row.groupIds.length === 1 && row.cursor === 0 && row.status === 'scheduled',
      ),
    ).toBe(true);
    const events = await t.prisma.db.outboxEvent.findMany({
      where: {
        type: 'bot.turn_due',
        OR: rows.map(({ id }) => ({ payload: { path: ['threadId'], equals: id } })),
      },
    });
    expect(events).toHaveLength(2);
    expect(events.map(({ payload }) => payload)).toEqual(
      expect.arrayContaining(
        rows.map(({ id }) => ({ threadId: id, turn: 0, at: now.toISOString() })),
      ),
    );
    await expect(
      t.prisma.db.botRotationCursor.create({
        data: { groupId: a.group.id, lastScriptId: script.id },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rotates independently, wraps, and survives terminal-thread pruning and previous-script deletion', async () => {
    const a = await fixture.group();
    const b = await fixture.group();
    const first = await fixture.script([a.group.id, b.group.id], a.persona.id);
    const second = await fixture.script([a.group.id, b.group.id], b.persona.id);
    const ordered = [first.id, second.id].sort();
    expect(await due()).toBe(2);
    expect((await active(a.group.id)).scriptId).toBe(ordered[0]);
    const busy = await active(b.group.id);
    const previous = await active(a.group.id);
    await t.prisma.db.botThread.updateMany({
      where: { id: previous.id, status: 'scheduled' },
      data: { status: 'done', nextAt: null },
    });
    await t.prisma.db.botThread.delete({ where: { id: previous.id } });
    expect(await due()).toBe(1);
    expect((await active(a.group.id)).scriptId).toBe(ordered[1]);
    expect((await active(b.group.id)).id).toBe(busy.id);
    await t.prisma.db.botThread.updateMany({
      where: { groupIds: { has: a.group.id }, status: 'scheduled' },
      data: { status: 'done', nextAt: null },
    });
    expect(await due()).toBe(1);
    expect((await active(a.group.id)).scriptId).toBe(ordered[0]);
    await t.prisma.db.botScript.delete({ where: { id: ordered[0]! } });
    expect(
      (await t.prisma.db.botRotationCursor.findUniqueOrThrow({ where: { groupId: a.group.id } }))
        .lastScriptId,
    ).toBe(ordered[0]);
    expect(await due()).toBe(2);
    expect((await active(a.group.id)).scriptId).toBe(ordered[1]);
    expect((await active(b.group.id)).scriptId).toBe(ordered[1]);
  });

  it('respects future schedules, enabled/global pause and live default-room/group fences', async () => {
    const a = await fixture.group();
    const b = await fixture.group();
    const c = await fixture.group();
    const d = await fixture.group();
    const future = await fixture.script([a.group.id], a.persona.id, new Date(now.getTime() + 1));
    const disabled = await fixture.script([b.group.id], b.persona.id);
    await t.prisma.db.botScript.update({ where: { id: disabled.id }, data: { enabled: false } });
    await fixture.script([c.group.id], c.persona.id);
    await t.prisma.db.group.update({ where: { id: c.group.id }, data: { deletedAt: now } });
    await fixture.script([d.group.id], d.persona.id);
    // Default rooms cannot be soft-deleted (709 DB invariant); simulate a missing room instead.
    await t.prisma.db.room.deleteMany({ where: { groupId: d.group.id } });
    expect(await due()).toBe(0);
    await t.prisma.db.botScript.update({ where: { id: future.id }, data: { runAt: now } });
    await fixture.enabled(false);
    expect(await due()).toBe(0);
    await fixture.enabled(true);
    await t.prisma.db.appSetting.upsert({
      where: { key: 'bot_schedule' },
      create: { key: 'bot_schedule', value: { fromDate: null, toDate: null, paused: true } },
      update: { value: { fromDate: null, toDate: null, paused: true } },
    });
    expect(await due()).toBe(0);
    await t.prisma.db.appSetting.delete({ where: { key: 'bot_schedule' } });
    expect(await due()).toBe(1);
    expect((await active(a.group.id)).scriptId).toBe(future.id);
  });

  it('never exceeds 30 slots, prunes only terminal history, and leaves a busy group alone', async () => {
    const a = await fixture.group();
    const b = await fixture.group();
    const script = await fixture.script([a.group.id, b.group.id], a.persona.id);
    const baseline = await t.prisma.db.botThread.count({
      where: { status: { in: ['scheduled', 'running'] } },
    });
    expect(baseline).toBeLessThan(29);
    const occupiedIds = Array.from({ length: 29 - baseline }, () => randomUUID());
    await t.prisma.db.botThread.createMany({
      data: occupiedIds.map((id) => ({
        id,
        scriptId: script.id,
        topic: 'Occupied slot',
        groupIds: [a.group.id],
        lines: [],
        status: 'running' as const,
        nextAt: now,
      })),
    });
    expect(await due()).toBe(1);
    expect(await t.prisma.db.botThread.count()).toBe(30);
    expect(
      await t.prisma.db.botThread.count({ where: { id: { in: occupiedIds }, status: 'running' } }),
    ).toBe(occupiedIds.length);
    expect(await due()).toBe(0);
    expect(
      await t.prisma.db.botRotationCursor.findUnique({ where: { groupId: a.group.id } }),
    ).toBeNull();
    expect((await active(b.group.id)).scriptId).toBe(script.id);
  });
});
