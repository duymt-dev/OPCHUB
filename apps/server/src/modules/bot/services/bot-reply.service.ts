import { BotScheduleService } from '../control/bot-schedule.service';
import { Injectable, Logger } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { PersonaReplyContextService } from '@/modules/chat';
import { botDayStart } from '../domain/active-hours';
import { botTurnDelayMs } from '../domain/schedule';
import { pickReplyPersona } from '../domain/reply-pick';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotRetentionService } from './bot-retention.service';
import { BotReplyCooldownService } from './bot-reply-cooldown.service';
import { BotControlFenceService } from './bot-control-fence.service';

type ReplySource = NonNullable<Awaited<ReturnType<PersonaReplyContextService['trigger']>>>;

@Injectable()
export class BotReplyService {
  private readonly logger = new Logger(BotReplyService.name);
  constructor(
    private readonly schedule: BotScheduleService,
    private readonly prisma: PrismaService,
    private readonly chat: PersonaReplyContextService,
    private readonly retention: BotRetentionService,
    private readonly cooldown: BotReplyCooldownService,
    private readonly outbox: OutboxService,
    private readonly fence: BotControlFenceService,
  ) {}

  async handle(messageId: string, now = new Date(), random = Math.random): Promise<string | null> {
    const result = await this.prisma.db.$transaction((tx) =>
      this.admit(tx, messageId, now, random),
    );
    if (!result) return null;
    try {
      await this.cooldown.record(result.roomId, result.createdAt);
    } catch {
      this.logger.warn('Reply cooldown cache unavailable; durable room guard retained');
    }
    return result.id;
  }

  private async admit(tx: DbTx, messageId: string, now: Date, random: () => number) {
    await lockBotExecution(tx);
    const raw = await tx.appSetting.findUniqueOrThrow({
      where: { key: 'bot' },
      select: { value: true },
    });
    const settings = botSettingsSchema.parse(raw.value);
    if (!settings.enabled || !settings.replyToMembers) return null;
    if (!(await this.schedule.allows(tx, now))) return null;
    const source = await this.chat.trigger(tx, messageId);
    if (!source || (await this.chat.alreadyAnswered(tx, messageId))) return null;
    if (!(await this.fence.allowsReply(tx, source.createdAt))) return null;
    if (
      await tx.botActivity.findUnique({
        where: { id: `bot-reply-skip-${messageId}` },
        select: { id: true },
      })
    )
      return null;
    const existing = await tx.botThread.findUnique({
      where: { triggerMessageId: messageId },
      select: { id: true, createdAt: true },
    });
    if (existing) return { ...existing, roomId: source.roomId };
    const pending = await tx.botThread.findFirst({
      where: {
        kind: 'reply',
        replyRoomId: source.roomId,
        status: { in: ['scheduled', 'running'] },
      },
      select: { replyRoomId: true },
    });
    if (pending) return null;
    const admitted = await tx.botThread.findFirst({
      where: { kind: 'reply', replyRoomId: source.roomId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { createdAt: true },
    });
    const posted = await this.chat.latestReplyAt(tx, source.roomId);
    const latestMs = Math.max(admitted?.createdAt.getTime() ?? 0, posted?.getTime() ?? 0);
    if (!(await this.cooldown.available(source.roomId, latestMs ? new Date(latestMs) : null, now)))
      return null;
    const personaId = await this.pick(tx, source, now, random);
    if (!personaId) {
      await tx.botActivity.createMany({
        data: [
          {
            id: `bot-reply-skip-${messageId}`,
            text: 'Không có persona trong giờ để phản hồi',
            messages: 0,
            createdAt: now,
          },
        ],
        skipDuplicates: true,
      });
      return null;
    }
    return this.create(tx, source, personaId, now, random);
  }

  private async create(
    tx: DbTx,
    source: ReplySource,
    personaId: string,
    now: Date,
    random: () => number,
  ) {
    if ((await this.retention.reserve(tx, 1)) < 1) return null;
    const nextAt = new Date(now.getTime() + botTurnDelayMs(0, random));
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
    now: Date,
    random: () => number,
  ) {
    const personas = await tx.persona.findMany({
      where: { enabled: true, groupIds: { has: source.groupId } },
      orderBy: { id: 'asc' },
      select: { id: true, enabled: true, groupIds: true, activeHours: true, postsPerDay: true },
    });
    const [counts, recent] = await Promise.all([
      this.chat.dailyCounts(
        tx,
        personas.map((p) => p.id),
        botDayStart(now),
      ),
      this.chat.recentSpeakers(tx, source.roomId),
    ]);
    return pickReplyPersona(
      personas.map((p) => ({ ...p, remaining: p.postsPerDay - (counts.get(p.id) ?? 0) })),
      source.groupId,
      now,
      recent,
      source.addressed,
      random,
    );
  }
}
