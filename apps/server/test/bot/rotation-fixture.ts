import { randomUUID } from 'node:crypto';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { createGroup } from '../factories/group.factory';
import type { TestApp } from '../setup/test-app';

class RotationFixtures {
  readonly scripts: string[] = [];
  readonly groups: string[] = [];
  private readonly personas: string[] = [];
  private readonly threadIds = new Set<string>();
  private enabledScripts: string[] = [];
  private original!: ReturnType<typeof botSettingsSchema.parse>;
  constructor(private readonly t: TestApp) {}
  async start() {
    this.original = botSettingsSchema.parse(
      (await this.t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    );
    this.enabledScripts = (
      await this.t.prisma.db.botScript.findMany({
        where: { enabled: true },
        select: { id: true },
      })
    ).map((row) => row.id);
    await this.t.prisma.db.botScript.updateMany({ data: { enabled: false } });
    await this.enabled(true);
  }
  async enabled(enabled: boolean) {
    await this.t.prisma.db.appSetting.update({
      where: { key: 'bot' },
      data: {
        value: { ...this.original, enabled, autoGenerate: false, replyToMembers: false },
      },
    });
  }
  async group() {
    const group = await createGroup(this.t);
    this.groups.push(group.id);
    const persona = await this.t.prisma.db.persona.create({
      data: {
        id: randomUUID(),
        name: 'Rotation persona',
        groupIds: [group.id],
        activeHours: 'Cả ngày',
        postsPerDay: 20,
      },
    });
    this.personas.push(persona.id);
    return { group, persona };
  }
  async script(groupIds: string[], personaId: string, runAt: Date | null = null) {
    const script = await this.t.prisma.db.botScript.create({
      data: {
        id: randomUUID(),
        topic: 'Rotation fixture',
        groupIds,
        runAt,
        lines: [{ personaId, body: 'Actual stored script body' }],
      },
    });
    this.scripts.push(script.id);
    return script;
  }
  async capture() {
    const threads = await this.t.prisma.db.botThread.findMany({
      where: { scriptId: { in: this.scripts } },
      select: { id: true },
    });
    for (const thread of threads) this.threadIds.add(thread.id);
  }
  async clear() {
    const threads = await this.t.prisma.db.botThread.findMany({
      where: { scriptId: { in: this.scripts } },
      select: { id: true },
    });
    for (const thread of threads) this.threadIds.add(thread.id);
    if (this.threadIds.size)
      await this.t.prisma.db.outboxEvent.deleteMany({
        where: {
          type: 'bot.turn_due',
          OR: [...this.threadIds].map((id) => ({ payload: { path: ['threadId'], equals: id } })),
        },
      });
    await this.t.prisma.db.botScript.deleteMany({ where: { id: { in: this.scripts } } });
  }
  async close() {
    await this.clear();
    await this.t.prisma.db.group.deleteMany({ where: { id: { in: this.groups } } });
    await this.t.prisma.db.persona.deleteMany({ where: { id: { in: this.personas } } });
    await this.t.prisma.db.botScript.updateMany({
      where: { id: { in: this.enabledScripts } },
      data: { enabled: true },
    });
    await this.t.prisma.db.appSetting.update({
      where: { key: 'bot' },
      data: { value: this.original },
    });
  }
}

export function rotationFixtures(t: TestApp) {
  return new RotationFixtures(t);
}
