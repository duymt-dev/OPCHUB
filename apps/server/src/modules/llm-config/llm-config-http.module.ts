import { Module } from '@nestjs/common';
import { LlmConfigCoreModule } from './llm-config-core.module';
import { AiSettingsController } from './ai-settings.controller';
import { AiCallsController } from './controllers/ai-calls.controller';
import { AiComposeController, AdminAiComposeController } from './controllers/ai-compose.controller';

@Module({
  imports: [LlmConfigCoreModule],
  controllers: [
    AiSettingsController,
    AiCallsController,
    AiComposeController,
    AdminAiComposeController,
  ],
})
export class LlmConfigHttpModule {}
