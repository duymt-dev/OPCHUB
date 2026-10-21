import { randomUUID } from 'node:crypto';
import { dashboardLiveSchema } from '@opchub/shared/api-domains';
import { DashboardContentCacheService } from '@/modules/dashboard';
import { PersonaTurnWriter, PersonaTurnPublisher } from '@/modules/chat';
import type { TestApp } from '../setup/test-app';
import { replyFixtures, replyValue } from '../bot/reply-fixture';
import { dashboardThreadClock } from './thread-clock';

export class ThreadFixture {
  readonly replies;
  readonly threadIds: string[] = [];
  private serial = 0;
  constructor(
    readonly t: TestApp,
    private readonly clock = dashboardThreadClock(),
  ) {
    this.replies = replyFixtures(t, clock);
  }
  async start() {
    await this.replies.start();
    await this.invalidate();
  }
  room() {
    return this.replies.room();
  }
  now() {
    return new Date(this.clock.getTime() + ++this.serial * 300000);
  }
  invalidate() {
    return this.t.app.get(DashboardContentCacheService).invalidate();
  }
  async live(token: string) {
    const response = await this.t.call('/dashboard/live', { token });
    if (response.status !== 200) throw new Error(`Dashboard read failed: ${response.status}`);
    return dashboardLiveSchema.parse(await response.json());
  }
  async thread(groupId: string, people: string[], kind: 'script' | 'auto' = 'script') {
    const at = this.now();
    const thread = await this.t.prisma.db.botThread.create({
      data: {
        topic: `Real dashboard execution ${randomUUID()}`,
        kind,
        isAuto: kind === 'auto',
        groupIds: [groupId],
        personaQueue: people,
        lines: people.map((personaId, i) => ({
          personaId,
          body: kind === 'auto' ? '' : `Script line ${i} ${randomUUID()}`,
        })),
        nextAt: at,
      },
    });
    this.threadIds.push(thread.id);
    return { thread, at };
  }
  async write(
    room: { group: { id: string }; persona: { id: string } },
    threadId: string = randomUUID(),
    turn = 0,
    kind: 'script' | 'auto' | 'reply' = 'script',
    at?: Date,
  ) {
    const rows = await this.t.prisma.db.$transaction((tx) =>
      this.t.app.get(PersonaTurnWriter).write(tx, {
        personaId: room.persona.id,
        groupIds: [room.group.id],
        clientMsgId: randomUUID(),
        body: `Dashboard real message ${randomUUID()}`,
        at: at ?? this.now(),
        context: { threadId, turn, kind },
      }),
    );
    const row = replyValue(rows[0]);
    return this.t.prisma.db.message.findUniqueOrThrow({ where: { id: row.id } });
  }
  async publish(id: string) {
    await this.t.app.get(PersonaTurnPublisher).publish(id);
  }
  async close() {
    await this.t.prisma.db.outboxEvent.deleteMany({
      where: {
        type: 'bot.turn_due',
        OR: this.threadIds.map((id) => ({ payload: { path: ['threadId'], equals: id } })),
      },
    });
    await this.t.prisma.db.botThread.deleteMany({ where: { id: { in: this.threadIds } } });
    await this.replies.close();
    await this.invalidate();
  }
}
