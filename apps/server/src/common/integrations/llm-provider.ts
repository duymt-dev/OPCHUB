import { FakeLlmProvider, LocalLlmProvider, type LlmProvider } from '@opchub/integrations';
import type { Env } from '../config';

/** Unconfigured/unsupported real providers must never silently run fake E2E. */
type LlmEnv = Pick<Env, 'BOT_LLM_PROVIDER' | 'NODE_ENV'> &
  Partial<
    Pick<
      Env,
      | 'LLM_LOCAL_BASE'
      | 'LLM_LOCAL_KEY'
      | 'LLM_LOCAL_MODELS'
      | 'LLM_LOCAL_MAX_REQUESTS'
      | 'LLM_LOCAL_MAX_TOKENS'
      | 'LLM_LOCAL_TIMEOUT_MS'
    >
  >;

export function createLlmProvider(env: LlmEnv, runtime: LlmProvider): LlmProvider {
  if (env.NODE_ENV !== 'test') return runtime;
  if (env.BOT_LLM_PROVIDER === 'fake') return new FakeLlmProvider();
  if (env.BOT_LLM_PROVIDER === 'local')
    return new LocalLlmProvider({
      baseUrl: env.LLM_LOCAL_BASE,
      apiKey: env.LLM_LOCAL_KEY,
      model: env.LLM_LOCAL_MODELS,
      maxRequests: env.LLM_LOCAL_MAX_REQUESTS,
      maxTokens: env.LLM_LOCAL_MAX_TOKENS,
      timeoutMs: env.LLM_LOCAL_TIMEOUT_MS,
    });
  throw new Error('Unsupported BOT_LLM_PROVIDER');
}
