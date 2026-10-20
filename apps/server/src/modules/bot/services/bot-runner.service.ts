import { Inject, Injectable } from '@nestjs/common';
import { botSettingsSchema, botStoredLinesSchema } from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PersonaTurnWriter } from '@/modules/chat';
import { isBotActiveHour } from '../domain/active-hours';
import { canBotThreadTransition } from '../domain/bot-thread-status';
import { botTurnDelayMs } from '../domain/schedule';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotTurnLimitsService } from './bot-turn-limits.service';
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
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly writer: PersonaTurnWriter,
    private readonly limits: BotTurnLimitsService,
    private readonly outbox: OutboxService,
  ) {}

  async postTurn(
    threadId: string,
    turn: number,
    now = new Date(),
    random = Math.random,
  ): Promise<boolean> {
    if (!this.env.FEATURE_BOTS) return false;
    const key = `bot-${threadId}-${turn}`;
    let reserved: string[] = [];
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        await lockBotExecution(tx);
        const setting = await tx.appSetting.findUniqueOrThrow({
          where: { key: 'bot' },
          select: { value: true },
        });
        if (!botSettingsSchema.parse(setting.value).enabled) return false;
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
        const lines = botStoredLinesSchema.parse(thread.lines);
        const reservation: Reservation = { key, groups: [] };
        let result: { posted: number; reason: string };
        try {
          result = await this.postLine(tx, thread, lines[turn], now, reservation);
        } finally {
          reserved = reservation.groups;
        }
        const { posted, reason } = result;
        await this.advance(tx, thread, lines.length, turn, posted, reason, now, random);
        return true;
      });
    } catch (error) {
      if (reserved.length) await this.limits.release(reserved, key);
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
  ): Promise<void> {
    const last = turn + 1 >= total;
    const status = last ? 'done' : 'running';
    if (status !== thread.status && !canBotThreadTransition(thread.status, status))
      throw new Error('Invalid bot transition');
    const nextAt = last
      ? null
      : new Date(now.getTime() + botTurnDelayMs(thread.script?.delayMinutes ?? 0, random));
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
    let posted = 0;
    let reason = 'Không có lượt hợp lệ';
    if (line) {
      await tx.$queryRaw`SELECT id FROM personas WHERE id = ${line.personaId} FOR UPDATE`;
      const persona = await tx.persona.findUnique({ where: { id: line.personaId } });
      reason = 'Persona đã tắt, bị xóa hoặc ngoài khung giờ';
      if (persona?.enabled && isBotActiveHour(persona.activeHours, now)) {
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
          (await this.limits.daily(tx, persona.id, persona.postsPerDay, rooms.length, now))
        ) {
          const groups = rooms.map((r) => r.groupId);
          await this.limits.reserve(groups, reservation.key, now);
          reservation.groups = groups;
          posted = (
            await this.writer.write(tx, {
              personaId: persona.id,
              groupIds: groups,
              clientMsgId: reservation.key,
              body: line.body,
              at: now,
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
