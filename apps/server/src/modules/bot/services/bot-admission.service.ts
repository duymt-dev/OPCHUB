import { BotRotationService } from '../rotation/bot-rotation.service';
import { BotScheduleService } from '../control/bot-schedule.service';
import { Injectable } from '@nestjs/common';
import { botStoredLinesSchema } from '@opchub/shared/api-domains';
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
    private readonly rotation: BotRotationService,
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
    return this.rotation.due(now);
  }
}
