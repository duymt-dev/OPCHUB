import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import { botSettingsSchema, botStoredLinesSchema } from '@opchub/shared/api-domains';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BotScheduleService } from '../control/bot-schedule.service';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotRetentionService } from '../services/bot-retention.service';
import { botRotationCandidatesSql, type RotationCandidate } from './bot-rotation.repository';

@Injectable()
export class BotRotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: BotScheduleService,
    private readonly retention: BotRetentionService,
    private readonly outbox: OutboxService,
  ) {}

  due(now: Date): Promise<number> {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const setting = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bot' },
        select: { value: true },
      });
      if (!botSettingsSchema.parse(setting.value).enabled) return 0;
      if (!(await this.schedule.allows(tx, now))) return 0;
      const candidates = await tx.$queryRaw<RotationCandidate[]>(botRotationCandidatesSql(now));
      const allowed = await this.retention.reserve(tx, candidates.length);
      if (!allowed) return 0;
      const selected = candidates.slice(0, allowed);
      const scripts = await tx.botScript.findMany({
        where: { id: { in: [...new Set(selected.map((row) => row.scriptId))] } },
        select: { id: true, topic: true, lines: true },
      });
      const byId = new Map(scripts.map((script) => [script.id, script]));
      const threads = await tx.botThread.createManyAndReturn({
        data: selected.map(({ groupId, scriptId }) => {
          const script = byId.get(scriptId);
          if (!script) throw new Error('Rotation candidate disappeared under execution lock');
          const lines = botStoredLinesSchema.parse(script.lines);
          return {
            scriptId,
            topic: script.topic,
            groupIds: [groupId],
            lines,
            personaQueue: lines.map((line) => line.personaId),
            status: 'scheduled' as const,
            nextAt: now,
          };
        }),
        select: { id: true },
      });
      await tx.botScript.updateMany({
        where: { id: { in: scripts.map((script) => script.id) } },
        data: { lastRunAt: now },
      });
      await this.advanceCursors(tx, selected, now);
      await this.outbox.addMany(
        tx,
        'bot.turn_due',
        threads.map((thread) => ({ threadId: thread.id, turn: 0, at: now.toISOString() })),
      );
      return threads.length;
    });
  }

  private async advanceCursors(tx: DbTx, selected: RotationCandidate[], now: Date) {
    // Let Prisma generate UUIDv7 IDs. Two bulk writes, never one query per group.
    await tx.botRotationCursor.createMany({
      data: selected.map(({ groupId, scriptId }) => ({
        groupId,
        lastScriptId: scriptId,
        createdAt: now,
        updatedAt: now,
      })),
      skipDuplicates: true,
    });
    await tx.$executeRaw(Prisma.sql`
      UPDATE bot_rotation_cursors c SET last_script_id = v.script_id, updated_at = ${now}
      FROM (VALUES ${Prisma.join(selected.map(({ groupId, scriptId }) => Prisma.sql`(${groupId}, ${scriptId})`))})
        AS v(group_id, script_id)
      WHERE c.group_id = v.group_id`);
  }
}
