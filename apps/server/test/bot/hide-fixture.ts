import { randomUUID } from 'node:crypto';
import { replyFixtures } from './reply-fixture';
import type { TestApp } from '../setup/test-app';

export class HideFixture {
  readonly replies;
  private baseline: { id: string; updatedAt: Date }[] = [];
  private firstEvent = 0n;
  constructor(private readonly t: TestApp) {
    this.replies = replyFixtures(t, new Date());
  }
  async start() {
    await this.replies.start();
    this.baseline = await this.t.prisma.db.message.findMany({
      where: { isSimulated: true, hiddenAt: null },
      select: { id: true, updatedAt: true },
    });
    const event = await this.t.prisma.db.outboxEvent.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    this.firstEvent = event?.id ?? 0n;
  }
  room() {
    return this.replies.room();
  }
  messages(roomId: string, personaId: string, count = 1) {
    return this.t.prisma.db.message.createManyAndReturn({
      data: Array.from({ length: count }, () => ({
        id: randomUUID(),
        roomId,
        personaId,
        isSimulated: true,
        body: 'Private persona text',
      })),
      select: { id: true },
    });
  }
  async close() {
    await this.t.prisma.db.$executeRaw`
      UPDATE messages m SET hidden_at = NULL, updated_at = b.updated_at
      FROM jsonb_to_recordset(${JSON.stringify(
        this.baseline.map((r) => ({
          id: r.id,
          updated_at: r.updatedAt,
        })),
      )}::jsonb) AS b(id text, updated_at timestamptz) WHERE m.id = b.id`;
    await this.t.prisma.db.outboxEvent.deleteMany({
      where: { type: 'bot.messages_hidden', id: { gt: this.firstEvent } },
    });
    await this.replies.close();
  }
}
