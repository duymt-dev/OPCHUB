import { randomUUID } from 'node:crypto';
import { botBulkCreateSchema, type BotBulkCreate } from '@opchub/shared/api-domains';
import { BotBulkControlService } from '@/modules/bot/bulk/bot-bulk-control.service';
import { BotBulkGenerationService } from '@/modules/bot/bulk/bot-bulk-generation.service';
import { tokenOf, createGroup } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

export const bulkResponse = (prefix: string = randomUUID(), turns = 4) =>
  JSON.stringify({
    lines: Array.from({ length: turns }, (_, index) => `${prefix} câu hội thoại ${index + 1}`),
  });

export class BulkFixture {
  actor = { id: '', ip: '127.0.0.1' };
  token = '';
  groupId = '';
  people: string[] = [];
  extraScripts: string[] = [];
  private originallyEnabled: string[] = [];
  constructor(public t: TestApp) {}

  async start() {
    this.originallyEnabled = (
      await this.t.prisma.db.persona.findMany({ where: { enabled: true }, select: { id: true } })
    ).map((row) => row.id);
    await this.t.prisma.db.persona.updateMany({
      where: { id: { in: this.originallyEnabled } },
      data: { enabled: false },
    });
    const actor = await createUser(this.t, { adminPermissions: ['bots.view', 'bots.action'] });
    this.actor.id = actor.id;
    this.token = await tokenOf(this.t, actor);
    this.groupId = (await createGroup(this.t)).id;
    const rows = await this.t.prisma.db.persona.createManyAndReturn({
      data: ['A', 'B'].map((name) => ({
        id: randomUUID(),
        name: `Bulk ${name}`,
        groupIds: [this.groupId],
        tone: 'Thân thiện',
        skills: 'Kế toán',
        bio: 'Kinh nghiệm thực tế',
        enabled: true,
      })),
      select: { id: true },
    });
    this.people = rows.map((row) => row.id);
  }
  input(patch: Partial<BotBulkCreate> = {}) {
    return botBulkCreateSchema.parse({
      requestId: randomUUID(),
      topics: [`Topic ${randomUUID()}`],
      groupIds: [this.groupId],
      perTopic: 1,
      ...patch,
    });
  }
  create(patch: Partial<BotBulkCreate> = {}) {
    return this.t.app.get(BotBulkControlService).create(this.actor, this.input(patch));
  }
  async step(batchId: string) {
    const row = await this.t.prisma.db.botBulkBatch.findUniqueOrThrow({ where: { id: batchId } });
    await this.t.app
      .get(BotBulkGenerationService)
      .run(batchId, row.cursor, row.nextAt ?? new Date());
  }
  async close() {
    const batches = await this.t.prisma.db.botBulkBatch.findMany({
      where: { actorId: this.actor.id },
      select: { id: true },
    });
    const ids = batches.map((row) => row.id);
    const items = await this.t.prisma.db.botBulkItem.findMany({
      where: { batchId: { in: ids } },
      select: { savedScriptId: true },
    });
    if (ids.length)
      await this.t.prisma.db.outboxEvent.deleteMany({
        where: {
          type: 'bot.bulk_due',
          OR: ids.map((id) => ({ payload: { path: ['batchId'], equals: id } })),
        },
      });
    await this.t.prisma.db.botScript.deleteMany({
      where: {
        id: {
          in: [
            ...this.extraScripts,
            ...items.flatMap((row) => (row.savedScriptId ? [row.savedScriptId] : [])),
          ],
        },
      },
    });
    await this.t.prisma.db.botBulkBatch.deleteMany({ where: { id: { in: ids } } });
    await this.t.prisma.db.persona.deleteMany({ where: { id: { in: this.people } } });
    await this.t.prisma.db.persona.updateMany({
      where: { id: { in: this.originallyEnabled } },
      data: { enabled: true },
    });
    if (this.groupId) await this.t.prisma.db.group.delete({ where: { id: this.groupId } });
  }
}
