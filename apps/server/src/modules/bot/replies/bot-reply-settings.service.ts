import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  botReplyControlSchema,
  botSettingsSchema,
  DEFAULT_BOT_REPLY_SETTINGS,
  type BotReplySettings,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '@/modules/settings';
import { lockBotExecution } from '../repositories/execution-lock';
import { type Actor, BotCatalogService } from '../services/bot-catalog.service';

const KEY = 'bot_reply_settings';

@Injectable()
export class BotReplySettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BotCatalogService,
    private readonly cache: AppSettingsService,
  ) {}

  async read(tx: DbTx) {
    const rows = await tx.appSetting.findMany({
      where: { key: { in: ['bot', KEY] } },
      select: { key: true, value: true },
    });
    const bot = botSettingsSchema.parse(rows.find((row) => row.key === 'bot')?.value);
    const stored = rows.find((row) => row.key === KEY);
    const control = stored
      ? botReplyControlSchema.parse(stored.value)
      : { sampleSize: 50, delaySeconds: 5, lastScanAt: null };
    return {
      bot,
      control,
      settings: {
        ...DEFAULT_BOT_REPLY_SETTINGS,
        sampleSize: control.sampleSize,
        delaySeconds: control.delaySeconds,
        autoEnabled: bot.replyToMembers,
      },
    };
  }

  async get() {
    return (await this.read(this.prisma.db)).settings;
  }

  async patch(actor: Actor, patch: Partial<BotReplySettings>) {
    const result = await this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const current = await this.read(tx);
      const settings = { ...current.settings, ...patch };
      await tx.appSetting.update({
        where: { key: 'bot' },
        data: { value: { ...current.bot, replyToMembers: settings.autoEnabled } },
      });
      await this.store(tx, {
        ...current.control,
        sampleSize: settings.sampleSize,
        delaySeconds: settings.delaySeconds,
      });
      await this.catalog.log(
        tx,
        actor,
        'bot.reply_settings.update',
        'bot',
        KEY,
        'Cập nhật trả lời từng tin',
      );
      return settings;
    });
    await this.cache.invalidate('bot');
    return result;
  }

  store(tx: DbTx, value: ReturnType<typeof botReplyControlSchema.parse>) {
    return tx.appSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value },
      update: { value },
      select: { key: true },
    });
  }
}
