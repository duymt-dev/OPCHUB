import { BotScheduleService } from '../control/bot-schedule.service';
import { Injectable } from '@nestjs/common';
import { botSettingsSchema, botStoredLinesSchema } from '@opchub/shared/api-domains';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { lockBotExecution } from '../repositories/execution-lock';
import { type Actor, BotCatalogService } from './bot-catalog.service';
import { BotRetentionService } from './bot-retention.service';

/** All creation paths share one admission lock and terminal-only 30-thread retention. */
@Injectable()
export class BotAdmissionService {
  constructor(
    private readonly schedule: BotScheduleService,
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly catalog: BotCatalogService,
    private readonly retention: BotRetentionService,
  ) {}

  manual(actor: Actor, scriptId: string, now = new Date()) {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      if (!(await this.schedule.allows(tx, now)))
        throw conflict('Bot đang tạm dừng hoặc ngoài lịch chạy');
      const script = await tx.botScript.findUnique({ where: { id: scriptId } });
      if (!script) throw notFound('Không tìm thấy kịch bản');
      if (!script.enabled) throw conflict('Kịch bản đang tắt');
      const existing = await tx.botThread.findFirst({
        where: { scriptId, status: { in: ['scheduled', 'running'] } },
        select: { id: true, status: true },
      });
      if (existing) {
        await this.catalog.log(
          tx,
          actor,
          'script.run',
          'script',
          scriptId,
          'Hội thoại đã nằm trong lịch chạy',
        );
        return { threadId: existing.id, status: existing.status };
      }
      if ((await this.retention.reserve(tx, 1)) < 1)
        throw conflict('Đã đạt giới hạn 30 hội thoại đang hoạt động');
      const lines = botStoredLinesSchema.parse(script.lines);
      const thread = await tx.botThread.create({
        data: {
          scriptId,
          topic: script.topic,
          groupIds: script.groupIds,
          lines,
          personaQueue: lines.map((line) => line.personaId),
          status: 'scheduled',
          nextAt: now,
        },
        select: { id: true, status: true },
      });
      await this.outbox.add(tx, 'bot.turn_due', {
        threadId: thread.id,
        turn: 0,
        at: now.toISOString(),
      });
      await this.catalog.log(
        tx,
        actor,
        'script.run',
        'script',
        scriptId,
        `Xếp lịch ${script.topic}`,
      );
      return { threadId: thread.id, status: thread.status };
    });
  }

  due(now: Date): Promise<number> {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const settings = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bot' },
        select: { value: true },
      });
      if (!botSettingsSchema.parse(settings.value).enabled) return 0;
      if (!(await this.schedule.allows(tx, now))) return 0;
      const candidates = await tx.$queryRaw<{ id: string }[]>`
        SELECT s.id FROM bot_scripts s WHERE s.enabled AND s.run_at <= ${now}
          AND (s.last_run_at IS NULL OR s.last_run_at < s.run_at)
          AND NOT EXISTS (SELECT 1 FROM bot_threads t WHERE t.script_id = s.id AND t.status <> 'done')
        ORDER BY s.run_at, s.id LIMIT 30`;
      const allowed = await this.retention.reserve(tx, candidates.length);
      if (!allowed) return 0;
      const scripts = await tx.botScript.findMany({
        where: { id: { in: candidates.slice(0, allowed).map((r) => r.id) } },
      });
      const threads = await tx.botThread.createManyAndReturn({
        data: scripts.map((script) => {
          const lines = botStoredLinesSchema.parse(script.lines);
          return {
            scriptId: script.id,
            topic: script.topic,
            groupIds: script.groupIds,
            lines,
            personaQueue: lines.map((line) => line.personaId),
            status: 'scheduled' as const,
            nextAt: now,
          };
        }),
        select: { id: true },
      });
      await tx.botScript.updateMany({
        where: { id: { in: scripts.map((s) => s.id) } },
        data: { lastRunAt: now },
      });
      await this.outbox.addMany(
        tx,
        'bot.turn_due',
        threads.map((t) => ({ threadId: t.id, turn: 0, at: now.toISOString() })),
      );
      return threads.length;
    });
  }
}
