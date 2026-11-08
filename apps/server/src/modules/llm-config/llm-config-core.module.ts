import type { LlmProvider } from '@opchub/integrations';
import type { AiPurpose } from '@opchub/shared/api-domains';
import { Global, Module } from '@nestjs/common';
import { LLM } from '@/common/integrations';
import { createLlmProvider } from '@/common/integrations/llm-provider';
import { AiConfigCache } from './ai-config-cache';
import { AiProviderRepository } from './repositories/ai-provider.repository';
import { AiCallRepository } from './repositories/ai-call.repository';
import { AiBudgetService } from './services/ai-budget.service';
import { AiSettingsService } from './services/ai-settings.service';
import { AiRouterService, LLM_ROUTER } from './services/ai-router.service';
import { LlmRuntimeService } from './llm-runtime.service';
import { AiReservationService } from './services/ai-reservation.service';
import { AiBudgetAlertService } from './services/ai-budget-alert.service';
import { AiBudgetAlertRepository } from './repositories/ai-budget-alert.repository';
import type { AiCallContext } from './services/ai-router.service';
import { ExportCoreModule } from '@/modules/export';
import { AiCallLogService } from './services/ai-call-log.service';
import { AiComposeService } from './services/ai-compose.service';
const services = [
  AiConfigCache,
  AiProviderRepository,
  AiCallRepository,
  AiBudgetService,
  AiSettingsService,
  AiRouterService,
  LlmRuntimeService,
  AiReservationService,
  AiBudgetAlertService,
  AiBudgetAlertRepository,
  AiCallLogService,
  AiComposeService,
];
@Global()
@Module({
  imports: [ExportCoreModule],
  providers: [
    ...services,
    { provide: LLM, inject: [LlmRuntimeService], useFactory: createLlmProvider },
    {
      provide: LLM_ROUTER,
      inject: [LLM, LlmRuntimeService],
      useFactory: (provider: LlmProvider, runtime: LlmRuntimeService) => ({
        forPurpose: (purpose: AiPurpose, context?: AiCallContext) =>
          provider === runtime ? runtime.forPurpose(purpose, context) : provider,
      }),
    },
  ],
  exports: [...services, LLM, LLM_ROUTER],
})
export class LlmConfigCoreModule {}
