import { FakeLlmProvider, type LlmProvider } from '@opchub/integrations';
import type { Env } from '../config';

/** Unconfigured/unsupported real providers must never silently run fake E2E. */
export function createLlmProvider(env: Pick<Env, 'BOT_LLM_PROVIDER'>): LlmProvider {
  if (env.BOT_LLM_PROVIDER === 'fake') return new FakeLlmProvider();
  throw new Error('Unsupported BOT_LLM_PROVIDER');
}
