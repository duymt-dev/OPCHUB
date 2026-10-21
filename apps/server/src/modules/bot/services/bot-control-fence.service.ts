import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { z } from 'zod';

export const BOT_CONTROL_KEY = 'bot_control';
const controlSchema = z.object({ stoppedAt: z.string().datetime() });

/** Durable across queue replay, settings changes, thread retention and Redis loss. */
@Injectable()
export class BotControlFenceService {
  async allowsReply(tx: DbTx, createdAt: Date): Promise<boolean> {
    const row = await tx.appSetting.findUnique({
      where: { key: BOT_CONTROL_KEY },
      select: { value: true },
    });
    return !row || createdAt.getTime() > Date.parse(controlSchema.parse(row.value).stoppedAt);
  }

  async stop(tx: DbTx, at: Date): Promise<void> {
    const value = { stoppedAt: at.toISOString() };
    await tx.appSetting.upsert({
      where: { key: BOT_CONTROL_KEY },
      create: { key: BOT_CONTROL_KEY, value },
      update: { value },
    });
  }

  async queueTimestamp(tx: DbTx): Promise<number> {
    const row = await tx.appSetting.findUnique({
      where: { key: BOT_CONTROL_KEY },
      select: { value: true },
    });
    return Math.max(Date.now(), row ? Date.parse(controlSchema.parse(row.value).stoppedAt) + 1 : 0);
  }
}
