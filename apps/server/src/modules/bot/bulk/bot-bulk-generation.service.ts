import { Inject, Injectable } from '@nestjs/common';
import { IntegrationError, type LlmProvider } from '@opchub/integrations';
import { botBulkPrompt, validateBotBulkCompletion } from '@opchub/shared';
import { botBulkCompletionSchema } from '@opchub/shared/api-domains';
import { LLM } from '@/common/integrations';
import { parseClean } from '@/common/html/sanitize-input';
import { BotBulkFlowService } from './bot-bulk-flow.service';

@Injectable()
export class BotBulkGenerationService {
  constructor(
    @Inject(LLM) private readonly llm: LlmProvider,
    private readonly flow: BotBulkFlowService,
  ) {}

  async run(batchId: string, cursor: number, injectedNow?: Date): Promise<void> {
    const now = () => injectedNow ?? new Date();
    const claim = await this.flow.claim(batchId, cursor, now());
    if (!claim) return;
    let response: string;
    try {
      response = await this.llm.complete(botBulkPrompt({ ...claim, ordinal: cursor }), {
        maxTokens: 1024,
      });
    } catch (error) {
      await this.flow.reject(
        claim,
        'provider',
        error instanceof IntegrationError && error.retryable,
        now(),
      );
      return;
    }
    let bodies: string[];
    try {
      const raw: unknown = JSON.parse(response);
      bodies = validateBotBulkCompletion(
        parseClean(botBulkCompletionSchema, raw),
        claim.personas.length,
      );
    } catch {
      await this.flow.reject(claim, 'invalid_response', true, now());
      return;
    }
    const lines = claim.personas.map((persona, index) => {
      const body = bodies[index];
      if (!body) throw new Error('Validated bulk line is missing');
      return { personaId: persona.id, body };
    });
    // A database failure must remain a worker failure, not be relabelled as provider output.
    await this.flow.finish(claim, lines, now());
  }
}
