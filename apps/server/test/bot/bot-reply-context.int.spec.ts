import { afterAll, beforeAll, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { LlmProvider } from '@opchub/integrations';
import { LLM } from '@/common/integrations';
import { BotRunnerService } from '@/modules/bot';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyFixtures, replyValue } from './reply-fixture';

describe('UAT-14 REQ-411 member reply context chronological control', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  let generate: MockInstance<LlmProvider['generateTurn']>;
  beforeAll(async () => {
    t = await createTestApp();
    fixture = replyFixtures(t, new Date());
    await fixture.start();
    generate = vi.spyOn(t.app.get<LlmProvider>(LLM), 'generateTurn');
  });
  afterAll(async () => {
    generate.mockRestore();
    await fixture.close();
    await t.close();
  });

  it('UAT-14 REQ-411 newest human trigger remains in the last10 history instead of filtering humans', async () => {
    const f = await fixture.room();
    const before = Date.now() - 20_000;
    await t.prisma.db.message.createMany({
      data: Array.from({ length: 13 }, (_, i) => ({
        roomId: f.roomId,
        personaId: f.persona.id,
        isSimulated: true,
        body: `Prior ${i}`,
        createdAt: new Date(before + i * 1000),
      })),
    });
    const source = await fixture.send(f.token, f.roomId, 'Newest member question');
    await fixture.admit(source.id, new Date(Date.parse(source.createdAt) + 1));
    const thread = await fixture.threadOf(source.id);
    expect(
      await t.app.get(BotRunnerService).postTurn(thread.id, 0, replyValue(thread.nextAt)),
    ).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    const context = generate.mock.calls[0]?.[0];
    expect(context?.persona.id).toBe(f.persona.id);
    expect(context?.topic).toBe(source.body);
    expect(context?.history).toEqual([
      ...Array.from({ length: 9 }, (_, i) => ({ personaId: f.persona.id, body: `Prior ${i + 4}` })),
      { personaId: null, body: source.body },
    ]);
    expect(
      await t.prisma.db.message.count({ where: { replyToId: source.id, isSimulated: true } }),
    ).toBe(1);
  });
});
