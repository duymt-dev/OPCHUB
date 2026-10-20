import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { LlmProvider } from '@opchub/integrations';
import { describe, expect, it } from 'vitest';
import { ENV } from '../config';
import { BANK, IntegrationsModule, LLM, MAIL, STORAGE, TAX_LOOKUP } from './integrations.module';

@Global()
@Module({
  providers: [{ provide: ENV, useValue: { BOT_LLM_PROVIDER: 'fake' } }],
  exports: [ENV],
})
class TestLlmConfigModule {}

describe('REQ-208 LLM dependency boundary', () => {
  it('REQ-208 exposes the turn adapter through the global integrations token', async () => {
    const builder = Test.createTestingModule({
      imports: [TestLlmConfigModule, IntegrationsModule],
    });
    // Unrelated providers must not create storage/mail/network clients for this unit test.
    for (const token of [BANK, MAIL, STORAGE, TAX_LOOKUP]) {
      builder.overrideProvider(token).useValue({});
    }
    const module = await builder.compile();
    try {
      const llm = module.get<LlmProvider>(LLM);
      expect(llm.name).toBe('fake');
      await expect(
        llm.generateTurn({
          topic: 'Quản lý công việc',
          persona: { id: 'p1', name: 'Hà', tone: '', skills: '' },
          history: [],
        }),
      ).resolves.toContain('Quản lý công việc');
    } finally {
      await module.close();
    }
  });
});
