import { randomUUID } from 'node:crypto';
import { botSettingsSchema, chatMessageSchema } from '@opchub/shared/api-domains';
import { BotReplyService } from '@/modules/bot';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import type { TestApp } from '../setup/test-app';

type BotSettings = ReturnType<typeof botSettingsSchema.parse>;
class ReplyFixtures {
  private readonly groups: string[] = [];
  private readonly personas: string[] = [];
  private readonly threads = new Set<string>();
  private original: BotSettings | null = null;
  constructor(
    private readonly t: TestApp,
    private readonly now: Date,
  ) {}

  async start() {
    this.original = botSettingsSchema.parse(
      (await this.t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    );
    await this.settings();
  }
  settings(patch: Partial<BotSettings> = {}) {
    if (!this.original) throw new Error('Reply fixture not started');
    return this.t.prisma.db.appSetting.update({
      where: { key: 'bot' },
      data: {
        value: {
          ...this.original,
          enabled: true,
          autoGenerate: false,
          replyToMembers: true,
          ...patch,
        },
      },
    });
  }
  async room() {
    const group = await createGroup(this.t);
    this.groups.push(group.id);
    const user = await createUser(this.t, { fee: 'active' });
    await addMember(this.t, group.id, user.id);
    const token = await tokenOf(this.t, user);
    const persona = await this.t.prisma.db.persona.create({
      data: {
        id: randomUUID(),
        name: 'Reply persona',
        groupIds: [group.id],
        activeHours: '00:00 - 24:00',
        postsPerDay: 20,
      },
    });
    this.personas.push(persona.id);
    return { group, user, token, persona, roomId: `${group.id}-general` };
  }
  async extraPersona(groupId: string, name: string) {
    const persona = await this.t.prisma.db.persona.create({
      data: {
        id: randomUUID(),
        name,
        groupIds: [groupId],
        activeHours: '00:00 - 24:00',
        postsPerDay: 20,
      },
    });
    this.personas.push(persona.id);
    return persona;
  }
  async send(
    token: string,
    roomId: string,
    body = 'Member asks a question',
    clientMsgId = randomUUID(),
    replyTo?: string,
  ) {
    const response = await this.t.call(`/rooms/${roomId}/messages`, {
      method: 'POST',
      token,
      json: { body, kind: 'text', clientMsgId, ...(replyTo ? { replyTo } : {}) },
    });
    if (response.status !== 201) throw new Error(`Member send failed: ${response.status}`);
    return chatMessageSchema.parse(await response.json());
  }
  async admit(id: string, at = this.now, random: () => number = () => 0) {
    const threadId = await this.t.app.get(BotReplyService).handle(id, at, random);
    if (threadId) this.threads.add(threadId);
    return threadId;
  }
  async threadOf(messageId: string) {
    const thread = await this.t.prisma.db.botThread.findUniqueOrThrow({
      where: { triggerMessageId: messageId },
    });
    this.threads.add(thread.id);
    return thread;
  }
  async close() {
    const messages = await this.t.prisma.db.message.findMany({
      where: { room: { groupId: { in: this.groups } } },
      select: { id: true },
    });
    await this.t.prisma.db.outboxEvent.deleteMany({
      where: {
        OR: [
          ...messages.map(({ id }) => ({ payload: { path: ['messageId'], equals: id } })),
          ...[...this.threads].map((id) => ({ payload: { path: ['threadId'], equals: id } })),
        ],
      },
    });
    await this.t.prisma.db.botThread.deleteMany({ where: { id: { in: [...this.threads] } } });
    await this.t.prisma.db.group.deleteMany({ where: { id: { in: this.groups } } });
    await this.t.prisma.db.persona.deleteMany({ where: { id: { in: this.personas } } });
    if (this.original)
      await this.t.prisma.db.appSetting.update({
        where: { key: 'bot' },
        data: { value: this.original },
      });
  }
}
export const replyFixtures = (t: TestApp, now: Date) => new ReplyFixtures(t, now);

export function replyValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error('Missing required reply fixture value');
  return value;
}
