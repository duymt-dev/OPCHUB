import { BotReplyLimitsService } from '../replies/bot-reply-limits.service';
import { BotReplyProgressService } from '../replies/bot-reply-progress.service';
import { BotScheduleService } from '../control/bot-schedule.service';
import { Injectable } from '@nestjs/common';
import {
  botSettingsSchema,
  botStoredLinesSchema,
  botMessageContextSchema,
} from '@opchub/shared/api-domains';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PersonaTurnWriter, PersonaReplyContextService } from '@/modules/chat';
import { isBotActiveHour } from '../domain/active-hours';
import { canBotThreadTransition } from '../domain/bot-thread-status';
import { botTurnDelayMs } from '../domain/schedule';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotTurnLimitsService } from './bot-turn-limits.service';
import { BotTurnDraftService } from './bot-turn-draft.service';
import type { DbTx, Prisma } from '@opchub/db';

type Execution = Prisma.BotThreadGetPayload<{
  include: { script: { select: { enabled: true; delayMinutes: true } } };
}>;
interface Reservation {
  key: string;
  groups: string[];
}

@Injectable()
export class BotRunnerService {
  constructor(
    private readonly replyLimits: BotReplyLimitsService,
    private readonly replyProgress: BotReplyProgressService,
    private readonly schedule: BotScheduleService,
    private readonly prisma: PrismaService,
    private readonly writer: PersonaTurnWriter,
    private readonly limits: BotTurnLimitsService,
    private readonly outbox: OutboxService,
    private readonly drafts: BotTurnDraftService,
    private readonly replies: PersonaReplyContextService,
  ) {}

  async postTurn(
    threadId: string,
    turn: number,
    injectedNow?: Date,
    random = Math.random,
  ): Promise<boolean> {
    if (!(await this.drafts.prepare(threadId, turn, injectedNow ?? new Date()))) return false;
    // Production time is sampled after LLM completion: generation latency must not consume
    // the next turn's 30s-5m spacing or bypass a newly closed activity window/day quota.
    const now = injectedNow ?? new Date();
    const key = `bot-${threadId}-${turn}`;
    let reserved: string[] = [];
    let isReply = false;
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        await lockBotExecution(tx);
        const setting = await tx.appSetting.findUniqueOrThrow({
          where: { key: 'bot' },
          select: { value: true },
        });
        const settings = botSettingsSchema.parse(setting.value);
        if (!settings.enabled || !(await this.schedule.allows(tx, now))) return false;
        await tx.$queryRaw`SELECT id FROM bot_threads WHERE id = ${threadId} FOR UPDATE`;
        const thread = await tx.botThread.findUnique({
          where: { id: threadId },
          include: { script: { select: { enabled: true, delayMinutes: true } } },
        });
        if (
          !thread ||
          thread.status === 'done' ||
          thread.cursor !== turn ||
          !thread.nextAt ||
          thread.nextAt > now ||
          thread.script?.enabled === false
        )
          return false;
        isReply = thread.kind === 'reply';
        if (isReply && !(await this.replyProgress.allows(tx, threadId, settings.replyToMembers)))
          return false;
        const lines = botStoredLinesSchema.parse(thread.lines);
        const reservation: Reservation = { key, groups: [] };
        let result: { posted: number; reason: string };
        try {
          result = await this.postLine(tx, thread, lines[turn], now, reservation);
        } finally {
          reserved = reservation.groups;
        }
        const { posted, reason } = result;
        await this.advance(
          tx,
          thread,
          lines.length,
          turn,
          posted,
          reason,
          now,
          random,
          thread.script?.delayMinutes ?? settings.delayMinutes,
        );
        if (isReply) await this.replyProgress.completeThread(tx, thread.id, posted, now);
        return true;
      });
    } catch (error) {
      if (isReply) await Promise.all(reserved.map((group) => this.replyLimits.release(group, key)));
      else if (reserved.length) await this.limits.release(reserved, key);
      throw error;
    }
  }

  private async advance(
    tx: DbTx,
    thread: Execution,
    total: number,
    turn: number,
    posted: number,
    reason: string,
    now: Date,
    random: () => number,
    delayMinutes: number,
  ): Promise<void> {
    const last = turn + 1 >= total;
    const status = last ? 'done' : 'running';
    if (status !== thread.status && !canBotThreadTransition(thread.status, status))
      throw new Error('Invalid bot transition');
    const nextAt = last ? null : new Date(now.getTime() + botTurnDelayMs(delayMinutes, random));
    const updated = await tx.botThread.updateMany({
      where: { id: thread.id, status: thread.status, cursor: turn },
      data: {
        status,
        cursor: turn + 1,
        nextAt,
        postedAt: posted ? (thread.postedAt ?? now) : thread.postedAt,
      },
    });
    if (updated.count !== 1) throw new Error('Bot cursor transition lost');
    await this.activity(
      tx,
      posted,
      posted
        ? `Đã đăng lượt ${turn + 1}/${total}: ${thread.topic}`
        : `Bỏ lượt ${turn + 1}: ${reason}`,
      now,
    );
    if (nextAt)
      await this.outbox.add(tx, 'bot.turn_due', {
        threadId: thread.id,
        turn: turn + 1,
        at: nextAt.toISOString(),
      });
  }

  private async postLine(
    tx: DbTx,
    thread: Execution,
    line: { personaId: string; body: string } | undefined,
    now: Date,
    reservation: Reservation,
  ): Promise<{ posted: number; reason: string }> {
    if (thread.kind === 'reply') {
      const trigger = thread.triggerMessageId
        ? await this.replies.trigger(tx, thread.triggerMessageId)
        : null;
      if (
        !trigger ||
        trigger.roomId !== thread.replyRoomId ||
        (await this.replies.alreadyAnswered(tx, trigger.id))
      )
        return { posted: 0, reason: 'Tin gốc không còn hợp lệ hoặc đã được phản hồi' };
    }
    let posted = 0;
    let reason = 'Không có lượt hợp lệ';
    if (line) {
      await tx.$queryRaw`SELECT id FROM personas WHERE id = ${line.personaId} FOR UPDATE`;
      const persona = await tx.persona.findUnique({ where: { id: line.personaId } });
      reason = 'Persona đã tắt, bị xóa hoặc ngoài khung giờ';
      if (
        persona?.enabled &&
        (thread.kind === 'reply' || isBotActiveHour(persona.activeHours, now))
      ) {
        const rooms = await tx.room.findMany({
          where: {
            isDefault: true,
            groupId: { in: thread.groupIds.filter((id) => persona.groupIds.includes(id)) },
            group: { deletedAt: null },
          },
          select: { groupId: true },
        });
        reason = 'Persona không có nhóm hợp lệ hoặc đã đạt tần suất ngày';
        if (
          rooms.length &&
          (thread.kind === 'reply' ||
            (await this.limits.daily(tx, persona.id, persona.postsPerDay, rooms.length, now)))
        ) {
          const groups = rooms.map((r) => r.groupId);
          if (thread.kind === 'reply') {
            const group = groups[0];
            if (!group || groups.length !== 1) throw new Error('Reply requires exactly one group');
            await this.replyLimits.reserve(group, reservation.key, now);
          } else await this.limits.reserve(groups, reservation.key, now);
          reservation.groups = groups;
          posted = (
            await this.writer.write(tx, {
              personaId: persona.id,
              groupIds: groups,
              clientMsgId: reservation.key,
              body: line.body,
              at: now,
              context: botMessageContextSchema.parse({
                threadId: thread.id,
                kind: thread.kind,
                turn: thread.cursor,
              }),
              ...(thread.triggerMessageId ? { replyToId: thread.triggerMessageId } : {}),
            })
          ).length;
        }
      }
    }
    return { posted, reason };
  }

  private activity(tx: DbTx, messages: number, text: string, now: Date) {
    return tx.botActivity.create({
      data: { messages, text, createdAt: now },
      select: { id: true },
    });
  }
}
