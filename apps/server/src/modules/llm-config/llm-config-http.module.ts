import { Module } from '@nestjs/common';
import { LlmConfigCoreModule } from './llm-config-core.module';
import { LlmConfigController } from './llm-config.controller';

@Module({ imports: [LlmConfigCoreModule], controllers: [LlmConfigController] })
export class LlmConfigHttpModule {}
