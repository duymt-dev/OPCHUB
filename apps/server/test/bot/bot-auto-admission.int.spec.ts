import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { botSettingsSchema, botStoredLinesSchema } from '@opchub/shared/api-domains';
import { BotAdmissionService, BotRunnerService } from '@/modules/bot';
import { BotAutoAdmissionService } from '@/modules/bot/services/bot-auto-admission.service';
import { createTestApp, type TestApp } from '../setup/test-app';
import { generationFixtures } from './generation-fixture';

describe('REQ-208 real automatic conversation admission', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof generationFixtures>;
  let original: ReturnType<typeof botSettingsSchema.parse>;
  const prefix = `Automatic ${randomUUID()}`;
  const scriptIds: string[] = [];
  let originallyEnabled: string[] = [];
  const now = new Date('2026-10-21T05:00:00Z');
  beforeAll(async () => {
    t = await createTestApp();
    original = botSettingsSchema.parse(
      (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    );
    fixture = generationFixtures(t, now);
    await fixture.start();
    originallyEnabled = (
      await t.prisma.db.botScript.findMany({ where: { enabled: true }, select: { id: true } })
    ).map((row) => row.id);
    await t.prisma.db.botScript.updateMany({ data: { enabled: false } });
    await settings();
  });
  afterAll(async () => {
    const rows = await t.prisma.db.botThread.findMany({
      where: { topic: { startsWith: prefix } },
      select: { id: true },
    });
    await t.prisma.db.outboxEvent.deleteMany({
      where: {
        type: 'bot.turn_due',
        OR: rows.map(({ id }) => ({ payload: { path: ['threadId'], equals: id } })),
      },
    });
    await t.prisma.db.botThread.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
    await t.prisma.db.botScript.deleteMany({ where: { id: { in: scriptIds } } });
    await t.prisma.db.botScript.updateMany({
      where: { id: { in: originallyEnabled } },
      data: { enabled: true },
    });
    await fixture.close();
    await t.close();
  });
  async function settings(patch: Partial<typeof original> = {}) {
    await t.prisma.db.appSetting.update({
      where: { key: 'bot' },
      data: {
        value: {
          ...original,
          enabled: true,
          autoGenerate: true,
          delayMinutes: 1,
          topics: [`${prefix} one`, `${prefix} two`],
          ...patch,
        },
      },
    });
  }
  async function target(groupId: string) {
    return t.prisma.db.botThread.findMany({
      where: { kind: 'auto', topic: { startsWith: prefix }, groupIds: { has: groupId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  it('REQ-208 autoGenerate/global switches gate admission; concurrent admission creates one blank-text plan per idle group', async () => {
    const { thread, group, people } = await fixture.thread();
    await t.prisma.db.botThread.delete({ where: { id: thread.id } });
    const admission = t.app.get(BotAutoAdmissionService);
    await settings({ autoGenerate: false });
    await admission.due(now, () => 0);
    expect(await target(group.id)).toHaveLength(0);
    await settings({ enabled: false });
    await admission.due(now, () => 0);
    expect(await target(group.id)).toHaveLength(0);
    await settings();
    await Promise.all([admission.due(now, () => 0), admission.due(now, () => 0)]);
    const rows = await target(group.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'auto',
      isAuto: true,
      status: 'scheduled',
      cursor: 0,
      nextAt: now,
      topic: `${prefix} one`,
    });
    const lines = botStoredLinesSchema.parse(rows[0]!.lines);
    expect(lines).toHaveLength(3);
    expect(new Set(lines.map((line) => line.personaId))).toEqual(new Set(people.map((p) => p.id)));
    expect(lines.every((line) => line.body === '')).toBe(true);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'bot.turn_due', payload: { path: ['threadId'], equals: rows[0]!.id } },
      }),
    ).toBe(1);
  });

  it('REQ-208 an active scripted/automatic conversation blocks another automatic conversation in its group', async () => {
    const { group } = await fixture.thread();
    await t.app.get(BotAutoAdmissionService).due(now, () => 0);
    expect(await target(group.id)).toHaveLength(0);
  });

  it('UAT-15 completed generated conversation allows the next configured topic, not a duplicate active thread', async () => {
    const { thread, group } = await fixture.thread();
    await t.prisma.db.botThread.delete({ where: { id: thread.id } });
    const admission = t.app.get(BotAutoAdmissionService);
    await admission.due(now, () => 0);
    let current = (await target(group.id))[0]!;
    const firstId = current.id;
    for (let turn = 0; turn < current.personaQueue.length; turn += 1) {
      expect(
        await t.app.get(BotRunnerService).postTurn(current.id, turn, current.nextAt!, () => 0),
      ).toBe(true);
      current = await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: current.id } });
    }
    expect(current.status).toBe('done');
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(3);
    await admission.due(new Date(now.getTime() + 300_000), () => 0);
    const rows = await target(group.id);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id !== firstId)).toMatchObject({
      topic: `${prefix} two`,
      status: 'scheduled',
      cursor: 0,
    });
  });

  it('D-112 enabled script rotation alternates with optional AI instead of starving generated conversations', async () => {
    const { thread, group, people } = await fixture.thread();
    await t.prisma.db.botThread.delete({ where: { id: thread.id } });
    const scriptId = randomUUID();
    scriptIds.push(scriptId);
    await t.prisma.db.botScript.create({
      data: {
        id: scriptId,
        topic: `${prefix} stored script`,
        groupIds: [group.id],
        lines: people.map((person) => ({ personaId: person.id, body: 'Stored rotation line' })),
      },
    });
    const scripts = t.app.get(BotAdmissionService);
    const generated = t.app.get(BotAutoAdmissionService);
    // Same three-pass order as the real scheduler; no eligible prior script means script first.
    await generated.due(now, () => 0, true);
    expect(await target(group.id)).toHaveLength(0);
    await scripts.due(now);
    const first = await t.prisma.db.botThread.findFirstOrThrow({ where: { scriptId } });
    await t.prisma.db.botThread.updateMany({
      where: { id: first.id, status: 'scheduled' },
      data: { status: 'done', nextAt: null },
    });
    await generated.due(now, () => 0, true);
    await scripts.due(now);
    const ai = await target(group.id);
    expect(ai).toHaveLength(1);
    expect(ai[0]?.kind).toBe('auto');
    expect(await t.prisma.db.botThread.count({ where: { scriptId } })).toBe(1);
    await t.prisma.db.botThread.updateMany({
      where: { id: ai[0]!.id, status: 'scheduled' },
      data: { status: 'done', nextAt: null },
    });
    await generated.due(now, () => 0, true);
    await scripts.due(now);
    expect(await target(group.id)).toHaveLength(1);
    expect(await t.prisma.db.botThread.count({ where: { scriptId, status: 'scheduled' } })).toBe(1);
  });
});
