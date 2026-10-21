import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type BotSettings,
  botSettingsSchema,
  type BotThread,
  type botSettingsPatchSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '@/modules/settings';
import { botDayStart } from '../domain/active-hours';
import { storedLinesSchema, toThread } from '../bot.mapper';
import { type Actor, BotCatalogService } from './bot-catalog.service';
import { BotAdmissionService } from './bot-admission.service';
import { BotThreadControlService } from './bot-thread-control.service';
import { lockBotExecution } from '../repositories/execution-lock';

/**
 * D-50: read models/settings and facades for scheduled execution and explicit stop.
 */
@Injectable()
export class BotThreadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BotCatalogService,
    private readonly admission: BotAdmissionService,
    private readonly control: BotThreadControlService,
    private readonly settings: AppSettingsService,
  ) {}

  async list(): Promise<BotThread[]> {
    const rows = await this.prisma.db.botThread.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    const personaIds = new Set<string>();
    const groupIds = new Set<string>();
    for (const r of rows) {
      r.groupIds.forEach((g) => groupIds.add(g));
      storedLinesSchema
        .catch([])
        .parse(r.lines)
        .forEach((l) => personaIds.add(l.personaId));
    }
    const [personas, groups] = await Promise.all([
      this.prisma.db.persona.findMany({
        where: { id: { in: [...personaIds] } },
        select: { id: true, name: true, title: true, color: true, avatarUrl: true },
      }),
      this.prisma.db.group.findMany({
        where: { id: { in: [...groupIds] } },
        select: { id: true, name: true },
      }),
    ]);
    const pm = new Map(personas.map((p) => [p.id, p]));
    const gm = new Map(groups.map((g) => [g.id, g.name]));
    return rows.map((r) => toThread(r, pm, gm));
  }

  run(actor: Actor, scriptId: string) {
    return this.admission.manual(actor, scriptId);
  }

  stop(actor: Actor, id: string) {
    return this.control.stop(actor, id);
  }

  async activity(now = new Date()) {
    const [items, today] = await Promise.all([
      this.prisma.db.botActivity.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 40,
        select: { id: true, text: true, createdAt: true },
      }),
      this.prisma.db.botActivity.aggregate({
        where: { createdAt: { gte: botDayStart(now) } },
        _sum: { messages: true },
      }),
    ]);
    return {
      items: items.map((a) => ({ id: a.id, text: a.text, createdAt: a.createdAt.toISOString() })),
      todayCount: today._sum.messages ?? 0,
    };
  }

  getSettings(): Promise<BotSettings> {
    return this.settings.get('bot', botSettingsSchema);
  }

  async patchSettings(
    actor: Actor,
    p: z.output<typeof botSettingsPatchSchema>,
  ): Promise<BotSettings> {
    const next = await this.prisma.db.$transaction(async (tx: DbTx) => {
      await lockBotExecution(tx);
      const current = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bot' },
        select: { value: true },
      });
      const next = botSettingsSchema.parse({ ...botSettingsSchema.parse(current.value), ...p });
      await tx.appSetting.update({ where: { key: 'bot' }, data: { value: next } });
      await this.catalog.log(
        tx,
        actor,
        'bot_settings.update',
        'bot_settings',
        'bot',
        'cập nhật cài đặt bot',
      );
      return next;
    });
    await this.settings.invalidate('bot');
    return next;
  }
}
