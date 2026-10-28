import { Injectable } from '@nestjs/common';
import { BOT_REPLY_SCAN_MS, botReplyDelayMs } from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { conflict, notFound } from '@/common/errors';
import { BotReplyScanService } from '@/modules/chat';
import { BotScheduleService } from '../control/bot-schedule.service';
import { lockBotExecution } from '../repositories/execution-lock';
import { type Actor, BotCatalogService } from '../services/bot-catalog.service';
import { BotReplyService } from '../services/bot-reply.service';
import { BotReplyProgressService, replyRunDto } from './bot-reply-progress.service';
import { BotReplySettingsService } from './bot-reply-settings.service';
import { BotReplyQueueService } from './bot-reply-queue.service';

@Injectable()
export class BotReplyRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: BotReplyScanService,
    private readonly settings: BotReplySettingsService,
    private readonly schedule: BotScheduleService,
    private readonly replies: BotReplyService,
    private readonly progress: BotReplyProgressService,
    private readonly catalog: BotCatalogService,
    private readonly outbox: OutboxService,
    private readonly queue: BotReplyQueueService,
  ) {}

  async current() {
    return replyRunDto(
      await this.prisma.db.botReplyRun.findFirst({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  }

  scan(actor?: Actor, now = new Date()) {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const { bot, settings, control } = await this.settings.read(tx);
      if (!bot.enabled || !(await this.schedule.allows(tx, now))) {
        if (actor) throw conflict('Bot đang tạm dừng hoặc ngoài lịch chạy');
        return null;
      }
      if (!actor && !settings.autoEnabled) return null;
      const running = await tx.botReplyRun.findFirst({ where: { status: 'running' } });
      if (running) {
        if (actor)
          await this.catalog.log(
            tx,
            actor,
            'bot.reply.scan',
            'bot_reply_run',
            running.id,
            'Giữ lượt quét đang chạy',
          );
        return replyRunDto(running);
      }
      if (
        !actor &&
        control.lastScanAt &&
        now.getTime() - Date.parse(control.lastScanAt) < BOT_REPLY_SCAN_MS
      )
        return null;
      await this.settings.store(tx, { ...control, lastScanAt: now.toISOString() });
      const candidates = await this.scanner.candidates(tx, settings.sampleSize);
      const personas = await tx.persona.findMany({
        where: { enabled: true, groupIds: { hasSome: candidates.map((c) => c.groupId) } },
        select: { groupIds: true },
      });
      const assigned = new Set(personas.flatMap((p) => p.groupIds));
      const candidate = candidates.find((c) => assigned.has(c.groupId));
      if (!candidate) {
        if (actor)
          await this.catalog.log(
            tx,
            actor,
            'bot.reply.scan',
            'bot',
            'reply',
            'Không có tin chờ với persona hợp lệ',
          );
        return null;
      }
      const nextAt = new Date(now.getTime() + botReplyDelayMs(settings.delaySeconds));
      const run = await tx.botReplyRun.create({
        data: {
          groupId: candidate.groupId,
          groupName: candidate.groupName,
          roomId: candidate.roomId,
          messageIds: candidate.messageIds,
          manual: !!actor,
          delaySeconds: settings.delaySeconds,
          nextAt,
          createdAt: now,
        },
      });
      await this.outbox.add(tx, 'bot.reply_run_due', {
        runId: run.id,
        cursor: 0,
        at: nextAt.toISOString(),
      });
      if (actor)
        await this.catalog.log(
          tx,
          actor,
          'bot.reply.scan',
          'bot_reply_run',
          run.id,
          'Bắt đầu trả lời từng tin',
        );
      return replyRunDto(run);
    });
  }

  materialize(id: string, cursor: number, now = new Date()) {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const run = await tx.botReplyRun.findUnique({ where: { id } });
      if (
        !run ||
        run.status !== 'running' ||
        run.cursor !== cursor ||
        run.activeThreadId ||
        !run.nextAt ||
        run.nextAt > now
      )
        return;
      const { bot } = await this.settings.read(tx);
      if (!bot.enabled || !(await this.schedule.allows(tx, now))) return;
      const sourceId = run.messageIds[cursor];
      if (!sourceId) throw new Error('Reply run cursor out of bounds');
      // Admitted runs continue when automatic scanning is switched off; global pause still fences.
      const thread = await this.replies.admit(tx, sourceId, now, Math.random, {
        manual: true,
        dueNow: true,
      });
      if (!thread) {
        if (
          (await tx.botThread.count({ where: { status: { in: ['scheduled', 'running'] } } })) >= 30
        )
          return;
        await this.progress.advance(tx, run, 0, now);
        return;
      }
      await tx.botReplyRun.updateMany({
        where: { id, status: 'running', cursor, activeThreadId: null },
        data: { activeThreadId: thread.id, nextAt: null },
      });
    });
  }

  async recover(now = new Date()) {
    const run = await this.prisma.db.botReplyRun.findFirst({
      where: { status: 'running', activeThreadId: null, nextAt: { lte: now } },
      select: { id: true, cursor: true, nextAt: true },
    });
    if (run?.nextAt)
      await this.queue.enqueue({ runId: run.id, cursor: run.cursor, at: run.nextAt.toISOString() });
  }

  stop(actor: Actor, id: string) {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const run = await tx.botReplyRun.findUnique({ where: { id } });
      if (!run) throw notFound('Không tìm thấy lượt trả lời');
      if (run.status !== 'running') throw conflict('Lượt trả lời đã dừng hoặc hoàn tất');
      if (run.activeThreadId)
        await tx.botThread.updateMany({
          where: { id: run.activeThreadId, status: { in: ['scheduled', 'running'] } },
          data: { status: 'done', nextAt: null },
        });
      const changed = await tx.botReplyRun.updateMany({
        where: { id, status: 'running' },
        data: { status: 'stopped', activeThreadId: null, nextAt: null },
      });
      if (!changed.count) throw conflict('Lượt trả lời vừa thay đổi');
      await this.catalog.log(
        tx,
        actor,
        'bot.reply.stop',
        'bot_reply_run',
        id,
        'Dừng trả lời từng tin',
      );
      return replyRunDto({ ...run, status: 'stopped', activeThreadId: null, nextAt: null });
    });
  }

  failThread(threadId: string, now = new Date()) {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const run = await tx.botReplyRun.findFirst({
        where: { status: 'running', activeThreadId: threadId },
        select: { id: true },
      });
      if (!run) return;
      await tx.botThread.updateMany({
        where: { id: threadId, status: { in: ['scheduled', 'running'] } },
        data: { status: 'done', nextAt: null },
      });
      await this.progress.completeThread(tx, threadId, 0, now);
      await tx.botActivity.create({
        data: {
          text: 'Không thể tạo phản hồi AI; kiểm tra cấu hình hoặc kết nối',
          messages: 0,
          createdAt: now,
        },
      });
    });
  }
}
