import { Module } from '@nestjs/common';
import { AccountCoreModule } from '../account';
import { ChatCoreModule } from '../chat';
import { LlmConfigCoreModule } from '@/modules/llm-config';
import { AdminModerationController } from './controllers/admin-moderation.controller';
import { MessageReportController } from './controllers/message-report.controller';
import { ReportRepository } from './repositories/report.repository';
import { ViolationRepository } from './repositories/violation.repository';
import { AdminModerationService } from './services/admin-moderation.service';
import { KeywordFilterService } from './services/keyword-filter.service';
import { ModerationSettingsService } from './services/moderation-settings.service';
import { ReportService } from './services/report.service';
import { ViolationService } from './services/violation.service';
import { AiModerationService } from './services/ai-moderation.service';
import { AiModerationQueueService } from './services/ai-moderation-queue.service';
import { AiModerationRepository } from './repositories/ai-moderation.repository';

const services = [
  AiModerationService,
  AiModerationQueueService,
  AiModerationRepository,
  ReportRepository,
  ViolationRepository,
  ModerationSettingsService,
  ViolationService,
  ReportService,
  AdminModerationService,
  KeywordFilterService,
];

/**
 * Kiểm duyệt (S-08, D-26, D-43). Nạp ở process có đường gửi tin (api + socket) để hook từ khoá
 * gắn vào MessageService; worker dùng ReportService cho job `moderation.keywordHit`.
 */
@Module({
  imports: [AccountCoreModule, ChatCoreModule, LlmConfigCoreModule],
  providers: services,
  exports: services,
})
export class ModerationCoreModule {}

@Module({
  imports: [ModerationCoreModule],
  controllers: [MessageReportController, AdminModerationController],
})
export class ModerationHttpModule {}
