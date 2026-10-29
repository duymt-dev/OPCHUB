import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { botScheduleState } from '@opchub/shared';
import {
  botScheduleSchema,
  DEFAULT_BOT_SCHEDULE,
  type BotSchedulePatch,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { parseClean } from '@/common/html/sanitize-input';
import { lockBotExecution } from '../repositories/execution-lock';
import { type Actor, BotCatalogService } from '../services/bot-catalog.service';

const KEY = 'bot_schedule';

@Injectable()
export class BotScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BotCatalogService,
  ) {}

  async read(db: Pick<DbTx, 'appSetting'> = this.prisma.db) {
    const row = await db.appSetting.findUnique({ where: { key: KEY }, select: { value: true } });
    if (!row) return { ...DEFAULT_BOT_SCHEDULE };
    const parsed = botScheduleSchema.safeParse(row.value);
    return parsed.success ? parsed.data : { ...DEFAULT_BOT_SCHEDULE, paused: true };
  }

  async get(now = new Date()) {
    const schedule = await this.read();
    return { schedule, state: botScheduleState(schedule, now) };
  }

  async allows(db: Pick<DbTx, 'appSetting'>, now: Date): Promise<boolean> {
    return botScheduleState(await this.read(db), now) === 'live';
  }

  patch(actor: Actor, patch: BotSchedulePatch) {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const schedule = parseClean(botScheduleSchema, { ...(await this.read(tx)), ...patch });
      await tx.appSetting.upsert({
        where: { key: KEY },
        create: { key: KEY, value: schedule },
        update: { value: schedule },
      });
      await this.catalog.log(
        tx,
        actor,
        'bot.schedule.update',
        'bot',
        KEY,
        'Cập nhật lịch chạy bot',
      );
      // Pause/resume is durable state, not a queue deletion. Tick recovers retained deadlines.
      return { schedule, state: botScheduleState(schedule, new Date()) };
    });
  }
}
