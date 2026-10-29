import type { LlmProvider } from '@opchub/integrations';
import { describe, expect, it } from 'vitest';
import { createLlmProvider } from './llm-provider';

const runtime: LlmProvider = {
  name: 'runtime-from-admin',
  complete: () => Promise.reject(new Error('Chưa cấu hình AI')),
  generateTurn: () => Promise.reject(new Error('Chưa cấu hình AI')),
};

describe('REQ-607 D-99 runtime adapter selection', () => {
  it.each(['development', 'production'] as const)(
    'ignores fake/local environment selection in %s',
    async (NODE_ENV) => {
      for (const BOT_LLM_PROVIDER of ['fake', 'local'] as const) {
        const adapter = createLlmProvider({ NODE_ENV, BOT_LLM_PROVIDER }, runtime);
        expect(adapter).toBe(runtime);
        await expect(adapter.complete('test')).rejects.toThrow('Chưa cấu hình AI');
      }
    },
  );
  it('allows explicit fake only in automated tests', async () => {
    const adapter = createLlmProvider({ NODE_ENV: 'test', BOT_LLM_PROVIDER: 'fake' }, runtime);
    expect(adapter.name).toBe('fake');
    await expect(
      adapter.generateTurn({
        topic: 'Quản lý công việc',
        persona: { id: 'p1', name: 'Hà', tone: '', skills: '' },
        history: [],
      }),
    ).resolves.toContain('Quản lý công việc');
  });
  it('explicit local test provider still requires valid configuration', () => {
    expect(
      createLlmProvider(
        {
          NODE_ENV: 'test',
          BOT_LLM_PROVIDER: 'local',
          LLM_LOCAL_BASE: 'https://example.test/v1',
          LLM_LOCAL_KEY: 'unit-key',
          LLM_LOCAL_MODELS: 'unit-model',
        },
        runtime,
      ).name,
    ).toBe('local-llm');
    expect(() =>
      createLlmProvider({ NODE_ENV: 'test', BOT_LLM_PROVIDER: 'local' }, runtime),
    ).toThrow('Invalid LLM configuration');
  });
});
