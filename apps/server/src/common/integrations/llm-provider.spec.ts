import { IntegrationError, type LlmProvider } from '@opchub/integrations';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLlmProvider } from './llm-provider';

afterEach(() => vi.unstubAllEnvs());

describe('A3 REQ-607 Admin-configured LLM boundary', () => {
  const configured = () =>
    ({
      name: 'admin-configured-llm',
      complete: vi.fn<LlmProvider['complete']>().mockResolvedValue('Configured response'),
      generateTurn: vi.fn<LlmProvider['generateTurn']>().mockResolvedValue('Configured turn'),
    }) satisfies LlmProvider;

  it.each(['development', 'test', 'production'])('always runtime in %s', async (mode) => {
    vi.stubEnv('NODE_ENV', mode);
    const runtime = configured();
    const provider = createLlmProvider(runtime);
    expect(provider).toBe(runtime);
    expect(await provider.complete('A3')).toBe('Configured response');
    expect(runtime.complete).toHaveBeenCalledWith('A3');
  });

  it('propagates an unconfigured runtime failure without a fake fallback', async () => {
    const runtime = configured();
    const failure = new IntegrationError('admin-configured-llm', 'Chưa cấu hình AI', false);
    vi.mocked(runtime.complete).mockRejectedValueOnce(failure);
    await expect(createLlmProvider(runtime).complete('A3')).rejects.toBe(failure);
    expect(runtime.generateTurn).not.toHaveBeenCalled();
  });
});
