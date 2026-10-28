import { BotConversationTypesRepository } from './bulk/bot-conversation-types.repository';
import { BotConversationTypesService } from './bulk/bot-conversation-types.service';
import { BotRotationService } from './rotation/bot-rotation.service';
import { BotReplyQueueService } from './replies/bot-reply-queue.service';
import { BotReplyOverviewService } from './replies/bot-reply-overview.service';
import { BotReplyRunsService } from './replies/bot-reply-runs.service';
import { BotReplyProgressService } from './replies/bot-reply-progress.service';
import { BotReplySettingsService } from './replies/bot-reply-settings.service';
import { BotReplyLimitsService } from './replies/bot-reply-limits.service';
import { BotScheduleService } from './control/bot-schedule.service';
import { Module } from '@nestjs/common';
import { LlmConfigCoreModule } from '@/modules/llm-config';
import { ChatCoreModule } from '@/modules/chat';
import { DashboardCoreModule } from '@/modules/dashboard';
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
import { BotRetentionService } from './services/bot-retention.service';
import { BotTurnDraftService } from './services/bot-turn-draft.service';
import { BotAutoAdmissionService } from './services/bot-auto-admission.service';
import { BotReplyService } from './services/bot-reply.service';
import { BotReplyCooldownService } from './services/bot-reply-cooldown.service';
import { BotControlFenceService } from './services/bot-control-fence.service';
import { BotKillSwitchService } from './services/bot-kill-switch.service';
import { BotWorkQueueService } from './services/bot-work-queue.service';
import { BotEmergencyCleanupService } from './services/bot-emergency-cleanup.service';
import { BotHideService } from './services/bot-hide.service';
import { BotHidePublicationService } from './services/bot-hide-publication.service';

const services = [
  BotConversationTypesRepository,
  BotConversationTypesService,
  BotRotationService,
  BotReplyOverviewService,
  BotReplySettingsService,
  BotReplyProgressService,
  BotReplyRunsService,
  BotReplyQueueService,

  BotReplyLimitsService,
  BotScheduleService,
  BotHideService,
  BotHidePublicationService,
  BotControlFenceService,
  BotKillSwitchService,
  BotWorkQueueService,
  BotEmergencyCleanupService,
  BotCatalogService,
  BotLogService,
  BotThreadService,
  BotAdmissionService,
  BotRunnerService,
  BotSchedulerService,
  BotTurnLimitsService,
  BotThreadControlService,
  BotRetentionService,
  BotTurnDraftService,
  BotAutoAdmissionService,
  BotReplyService,
  BotReplyCooldownService,
];

@Module({
  imports: [
    ChatCoreModule,
    SettingsCoreModule,
    UploadsCoreModule,
    DashboardCoreModule,
    LlmConfigCoreModule,
  ],
  providers: services,
  exports: services,
})
export class BotCoreModule {}
