import type { LlmProvider } from '@opchub/integrations';
import type { AiPurpose } from '@opchub/shared/api-domains';
import { Global, Module } from '@nestjs/common';
import { ENV } from '@/common/config';
import { LLM } from '@/common/integrations';
import { createLlmProvider } from '@/common/integrations/llm-provider';
import { AiConfigCache } from './ai-config-cache';
import { AiProviderRepository } from './repositories/ai-provider.repository';
import { AiCallRepository } from './repositories/ai-call.repository';
import { AiBudgetService } from './services/ai-budget.service';
import { AiSettingsService } from './services/ai-settings.service';
import { AiRouterService, LLM_ROUTER } from './services/ai-router.service';
import { LlmRuntimeService } from './llm-runtime.service';
const services = [
  AiConfigCache,
  AiProviderRepository,
  AiCallRepository,
  AiBudgetService,
  AiSettingsService,
  AiRouterService,
  LlmRuntimeService,
];
@Global()
@Module({
  providers: [
    ...services,
    { provide: LLM, inject: [ENV, LlmRuntimeService], useFactory: createLlmProvider },
    {
      provide: LLM_ROUTER,
      inject: [LLM, LlmRuntimeService],
      useFactory: (provider: LlmProvider, runtime: LlmRuntimeService) => ({
        forPurpose: (purpose: AiPurpose) =>
          provider === runtime ? runtime.forPurpose(purpose) : provider,
      }),
    },
  ],
  exports: [...services, LLM, LLM_ROUTER],
})
export class LlmConfigCoreModule {}
