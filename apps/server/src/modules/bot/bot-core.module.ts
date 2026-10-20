import { Module } from '@nestjs/common';
import { ChatCoreModule } from '@/modules/chat';
import { SettingsCoreModule } from '@/modules/settings';
import { UploadsCoreModule } from '@/modules/uploads';
import { BotCatalogService } from './services/bot-catalog.service';
import { BotLogService } from './services/bot-log.service';
import { BotThreadService } from './services/bot-thread.service';
import { BotAdmissionService } from './services/bot-admission.service';
import { BotRunnerService } from './services/bot-runner.service';
import { BotSchedulerService } from './services/bot-scheduler.service';
import { BotTurnLimitsService } from './services/bot-turn-limits.service';
import { BotThreadControlService } from './services/bot-thread-control.service';

const services = [
  BotCatalogService,
  BotLogService,
  BotThreadService,
  BotAdmissionService,
  BotRunnerService,
  BotSchedulerService,
  BotTurnLimitsService,
  BotThreadControlService,
];

@Module({
  imports: [ChatCoreModule, SettingsCoreModule, UploadsCoreModule],
  providers: services,
  exports: services,
})
export class BotCoreModule {}
