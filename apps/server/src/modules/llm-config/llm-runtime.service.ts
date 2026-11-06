import { Injectable } from '@nestjs/common';
import type { LlmProvider, LlmTurnContext } from '@opchub/integrations';
import type { AiPurpose } from '@opchub/shared/api-domains';
import { AiRouterService } from './services/ai-router.service';
@Injectable()
export class LlmRuntimeService implements LlmProvider {
  readonly name = 'admin-configured-llm';
  constructor(private readonly router: AiRouterService) {}
  forPurpose(purpose: AiPurpose) {
    return this.router.forPurpose(purpose);
  }
  complete(prompt: string, opts?: { maxTokens?: number }) {
    return this.forPurpose('bot').complete(prompt, opts);
  }
  generateTurn(context: LlmTurnContext) {
    return this.forPurpose('bot').generateTurn(context);
  }
}
