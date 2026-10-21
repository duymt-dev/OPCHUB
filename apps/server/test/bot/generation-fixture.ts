import { randomUUID } from 'node:crypto';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { createGroup } from '../factories/group.factory';
import type { TestApp } from '../setup/test-app';

export function generationFixtures(t: TestApp, now: Date) {
  const threadIds: string[] = [];
  const groupIds: string[] = [];
  const personaIds: string[] = [];
  let original: ReturnType<typeof botSettingsSchema.parse>;
  return {
    async start() {
      original = botSettingsSchema.parse(
        (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
      );
      await this.enabled(true);
    },
    async enabled(enabled: boolean) {
      await t.prisma.db.appSetting.update({
        where: { key: 'bot' },
        data: {
          value: {
            ...original,
            enabled,
            autoGenerate: false,
            delayMinutes: 1,
          },
        },
      });
    },
    async thread() {
      const group = await createGroup(t);
      groupIds.push(group.id);
      const people = await t.prisma.db.persona.createManyAndReturn({
        data: ['A', 'B'].map((name) => ({
          id: randomUUID(),
          name: `Generation ${name}`,
          tone: 'friendly',
          skills: 'testing',
          groupIds: [group.id],
          activeHours: '00:00 - 24:00',
          postsPerDay: 20,
        })),
      });
      personaIds.push(...people.map((p) => p.id));
      const [first, second] = people;
      if (!first || !second) throw new Error('Missing generated persona fixtures');
      const queue = [first.id, second.id, first.id];
      const thread = await t.prisma.db.botThread.create({
        data: {
          topic: `Generated topic ${randomUUID()}`,
          groupIds: [group.id],
          kind: 'auto',
          isAuto: true,
          personaQueue: queue,
          lines: queue.map((personaId) => ({ personaId, body: '' })),
          nextAt: now,
        },
      });
      threadIds.push(thread.id);
      return { thread, group, people };
    },
    async close() {
      await t.prisma.db.outboxEvent.deleteMany({
        where: {
          type: 'bot.turn_due',
          OR: threadIds.map((id) => ({ payload: { path: ['threadId'], equals: id } })),
        },
      });
      await t.prisma.db.botThread.deleteMany({ where: { id: { in: threadIds } } });
      await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds } } });
      await t.prisma.db.persona.deleteMany({ where: { id: { in: personaIds } } });
      await t.prisma.db.appSetting.update({ where: { key: 'bot' }, data: { value: original } });
    },
  };
}

export function signal<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
