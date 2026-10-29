import { Global, Module } from '@nestjs/common';
import { LlmConfigCache } from './llm-config-cache';
import { LlmConfigService } from './llm-config.service';
import { ENV } from '@/common/config';
import { LLM } from '@/common/integrations';
import { createLlmProvider } from '@/common/integrations/llm-provider';
import { LlmRuntimeService } from './llm-runtime.service';

@Global()
@Module({
  providers: [
    LlmConfigCache,
    LlmConfigService,
    LlmRuntimeService,
    { provide: LLM, inject: [ENV, LlmRuntimeService], useFactory: createLlmProvider },
  ],
  exports: [LlmConfigCache, LlmConfigService, LlmRuntimeService, LLM],
})
export class LlmConfigCoreModule {}
