import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { PersonaVisibilityService } from '@/modules/chat';
import { DashboardContentCacheService } from '@/modules/dashboard';
import { type Actor, BotCatalogService } from './bot-catalog.service';

@Injectable()
export class BotHideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: PersonaVisibilityService,
    private readonly catalog: BotCatalogService,
    private readonly outbox: OutboxService,
    private readonly dashboard: DashboardContentCacheService,
  ) {}

  async hide(actor: Actor, groupIds?: string[]) {
    const result = await this.prisma.db.$transaction(async (tx) => {
      const at = new Date();
      const result = await this.chat.hide(tx, at, groupIds);
      await this.catalog.log(
        tx,
        actor,
        'bot.hide_messages',
        'bot_settings',
        'bot',
        `Ẩn ${result.hidden} tin bot trong ${result.roomIds.length} phòng`,
      );
      if (result.hidden)
        await this.outbox.add(tx, 'bot.messages_hidden', {
          roomIds: result.roomIds,
          messageIds: result.messageIds,
          bulk: result.bulk,
          at: at.toISOString(),
        });
      return { hidden: result.hidden, rooms: result.roomIds.length };
    });
    await this.dashboard.invalidate();
    return result;
  }
}
