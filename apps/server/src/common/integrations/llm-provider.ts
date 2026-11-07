import type { LlmProvider } from '@opchub/integrations';

/** Runtime is always Admin-configured; tests override the LLM token explicitly. */
export function createLlmProvider(runtime: LlmProvider): LlmProvider {
  return runtime;
}
