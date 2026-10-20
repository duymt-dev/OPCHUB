import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotCoreModule } from './bot-core.module';
import { BotEmergencyController } from './bot-emergency.controller';

/** FEATURE_BOTS (D-05) — chỉ đăng ký khi bật cờ (whenFeature) */
@Module({
  imports: [BotCoreModule],
  controllers: [BotController, BotEmergencyController],
  exports: [BotCoreModule],
})
export class BotHttpModule {}
