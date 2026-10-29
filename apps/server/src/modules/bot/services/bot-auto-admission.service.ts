import { BotScheduleService } from '../control/bot-schedule.service';
import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { botDayStart } from '../domain/active-hours';
import { nextAutoTopic, planAutoPersonas } from '../domain/auto-plan';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotRetentionService } from './bot-retention.service';

@Injectable()
export class BotAutoAdmissionService {
  constructor(
    private readonly schedule: BotScheduleService,
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly retention: BotRetentionService,
  ) {}

  due(now: Date, random = Math.random, afterScriptOnly = false): Promise<number> {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const setting = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bot' },
        select: { value: true },
      });
      const settings = botSettingsSchema.parse(setting.value);
      if (!settings.enabled || !settings.autoGenerate || !settings.topics.length) return 0;
      if (!(await this.schedule.allows(tx, now))) return 0;
      const loaded = await this.load(tx, now);
      if (!loaded) return 0;
      const { personas, threads, groups, counts } = loaded;
      const used = new Map(counts.map((row) => [row.personaId, row._count._all]));
      const candidates = personas.map((p) => ({
        ...p,
        remaining: p.postsPerDay - (used.get(p.id) ?? 0),
      }));
      const occupied = new Set(
        threads.filter((t) => t.status !== 'done').flatMap((t) => t.groupIds),
      );
      const plans = groups
        .filter((g) => !occupied.has(g.id))
        .filter(
          (g) =>
            !afterScriptOnly ||
            threads.find((t) => t.kind !== 'reply' && t.groupIds.includes(g.id))?.kind === 'script',
        )
        .flatMap((group) => {
          const queue = planAutoPersonas(candidates, group.id, now, random);
          if (!queue.length) return [];
          const previous = threads.find((t) => t.kind === 'auto' && t.groupIds.includes(group.id));
          const topic = nextAutoTopic(settings.topics, previous?.topic);
          if (!topic) return [];
          for (const id of queue) {
            const p = candidates.find((p) => p.id === id);
            if (p) p.remaining -= 1;
          }
          return [
            {
              topic,
              groupIds: [group.id],
              personaQueue: queue,
              lines: queue.map((personaId) => ({ personaId, body: '' })),
              kind: 'auto',
              isAuto: true,
              status: 'scheduled' as const,
              nextAt: now,
            },
          ];
        });
      const allowed = await this.retention.reserve(tx, plans.length);
      if (!allowed) return 0;
      const created = await tx.botThread.createManyAndReturn({
        data: plans.slice(0, allowed),
        select: { id: true },
      });
      await this.outbox.addMany(
        tx,
        'bot.turn_due',
        created.map((row) => ({ threadId: row.id, turn: 0, at: now.toISOString() })),
      );
      return created.length;
    });
  }
  private async load(tx: DbTx, now: Date) {
    const [personas, threads] = await Promise.all([
      tx.persona.findMany({
        where: { enabled: true },
        orderBy: { id: 'asc' },
        select: { id: true, enabled: true, groupIds: true, activeHours: true, postsPerDay: true },
      }),
      tx.botThread.findMany({
        select: { status: true, kind: true, topic: true, groupIds: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    if (personas.length < 2) return null;
    const start = botDayStart(now);
    const [groups, counts] = await Promise.all([
      tx.group.findMany({
        where: {
          id: { in: [...new Set(personas.flatMap((p) => p.groupIds))] },
          deletedAt: null,
          rooms: { some: { isDefault: true } },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      }),
      tx.message.groupBy({
        by: ['personaId'],
        where: {
          personaId: { in: personas.map((p) => p.id) },
          isSimulated: true,
          createdAt: { gte: start, lt: new Date(start.getTime() + 86400000) },
        },
        _count: { _all: true },
      }),
    ]);
    return { personas, threads, groups, counts };
  }
}
