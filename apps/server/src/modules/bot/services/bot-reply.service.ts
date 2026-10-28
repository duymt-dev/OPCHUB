import { BotScheduleService } from '../control/bot-schedule.service';
import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { PersonaReplyContextService } from '@/modules/chat';
import { botReplyDelayMs } from '@opchub/shared';
import { pickEnabledReplyPersona } from '../replies/reply-persona';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotRetentionService } from './bot-retention.service';
import { BotControlFenceService } from './bot-control-fence.service';

type ReplySource = NonNullable<Awaited<ReturnType<PersonaReplyContextService['trigger']>>>;

@Injectable()
export class BotReplyService {
  constructor(
    private readonly schedule: BotScheduleService,
    private readonly prisma: PrismaService,
    private readonly chat: PersonaReplyContextService,
    private readonly retention: BotRetentionService,
    private readonly outbox: OutboxService,
    private readonly fence: BotControlFenceService,
  ) {}

  async handle(messageId: string, now = new Date(), random = Math.random): Promise<string | null> {
    const result = await this.prisma.db.$transaction((tx) =>
      this.admit(tx, messageId, now, random),
    );
    if (!result) return null;
    return result.id;
  }

  async admit(
    tx: DbTx,
    messageId: string,
    now: Date,
    random: () => number,
    options: { manual?: boolean; delaySeconds?: number; dueNow?: boolean } = {},
  ) {
    await lockBotExecution(tx);
    const raw = await tx.appSetting.findUniqueOrThrow({
      where: { key: 'bot' },
      select: { value: true },
    });
    const settings = botSettingsSchema.parse(raw.value);
    if (!settings.enabled || (!settings.replyToMembers && !options.manual)) return null;
    if (!(await this.schedule.allows(tx, now))) return null;
    const source = await this.chat.trigger(tx, messageId);
    if (!source || (await this.chat.alreadyAnswered(tx, messageId))) return null;
    if (!(await this.fence.allowsReply(tx, source.createdAt))) return null;
    const existing = await tx.botThread.findUnique({
      where: { triggerMessageId: messageId },
      select: { id: true, createdAt: true, status: true },
    });
    if (existing && existing.status !== 'done') return { ...existing, roomId: source.roomId };
    const pending = await tx.botThread.findFirst({
      where: {
        kind: 'reply',
        replyRoomId: source.roomId,
        status: { in: ['scheduled', 'running'] },
      },
      select: { replyRoomId: true },
    });
    if (pending) return null;
    const personaId = await this.pick(tx, source, random);
    if (!personaId) {
      await tx.botActivity.createMany({
        data: [
          {
            id: `bot-reply-skip-${messageId}`,
            text: 'Không có persona đang bật trong nhóm để phản hồi',
            messages: 0,
            createdAt: now,
          },
        ],
        skipDuplicates: true,
      });
      return null;
    }
    // A failed/empty terminal attempt may be retried after configuration/persona changes.
    // Already answered sources were fenced above; completed chat content is never removed.
    if (existing) await tx.botThread.deleteMany({ where: { id: existing.id, status: 'done' } });
    return this.create(tx, source, personaId, now, options);
  }

  private async create(
    tx: DbTx,
    source: ReplySource,
    personaId: string,
    now: Date,
    options: { delaySeconds?: number; dueNow?: boolean },
  ) {
    if ((await this.retention.reserve(tx, 1)) < 1) return null;
    const nextAt = new Date(
      now.getTime() + (options.dueNow ? 0 : botReplyDelayMs(options.delaySeconds ?? 5)),
    );
    const thread = await tx.botThread.create({
      data: {
        kind: 'reply',
        isAuto: false,
        triggerMessageId: source.id,
        replyRoomId: source.roomId,
        groupIds: [source.groupId],
        topic: source.body || 'Trao đổi trong nhóm',
        lines: [{ personaId, body: '' }],
        personaQueue: [personaId],
        status: 'scheduled',
        nextAt,
        createdAt: now,
      },
      select: { id: true, createdAt: true },
    });
    await this.outbox.add(tx, 'bot.turn_due', {
      threadId: thread.id,
      turn: 0,
      at: nextAt.toISOString(),
    });
    return { ...thread, roomId: source.roomId };
  }

  private async pick(
    tx: DbTx,
    source: { groupId: string; roomId: string; addressed: string | null },
    random: () => number,
  ) {
    const personas = await tx.persona.findMany({
      where: { enabled: true, groupIds: { has: source.groupId } },
      orderBy: { id: 'asc' },
      select: { id: true, enabled: true, groupIds: true },
    });
    const recent = await this.chat.recentSpeakers(tx, source.roomId);
    return pickEnabledReplyPersona(personas, source.groupId, recent, source.addressed, random);
  }
}
