import { Module } from '@nestjs/common';
import { LlmConfigCoreModule } from './llm-config-core.module';
import { AiSettingsController } from './ai-settings.controller';

@Module({ imports: [LlmConfigCoreModule], controllers: [AiSettingsController] })
export class LlmConfigHttpModule {}
