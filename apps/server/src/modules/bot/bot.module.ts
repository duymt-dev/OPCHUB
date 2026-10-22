import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotCoreModule } from './bot-core.module';
import { BotEmergencyController } from './bot-emergency.controller';

/** Bot is always registered; runtime settings control execution. */
@Module({
  imports: [BotCoreModule],
  controllers: [BotController, BotEmergencyController],
  exports: [BotCoreModule],
})
export class BotHttpModule {}
