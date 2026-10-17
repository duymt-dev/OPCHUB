import { Module } from '@nestjs/common';
import { ChatCoreModule } from '@/modules/chat';
import { BotController } from './bot.controller';
import { BotCatalogService } from './services/bot-catalog.service';
import { BotLogService } from './services/bot-log.service';
import { BotThreadService } from './services/bot-thread.service';

/** FEATURE_BOTS (D-05) — chỉ đăng ký khi bật cờ (whenFeature) */
@Module({
  imports: [ChatCoreModule],
  controllers: [BotController],
  providers: [BotCatalogService, BotThreadService, BotLogService],
  exports: [BotThreadService],
})
export class BotHttpModule {}
