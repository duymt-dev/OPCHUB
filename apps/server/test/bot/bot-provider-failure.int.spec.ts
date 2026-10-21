import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { FakeLlmProvider, IntegrationError } from '@opchub/integrations';
import { LLM } from '@/common/integrations';
import { BotRunnerService } from '@/modules/bot';
import { createTestApp, type TestApp } from '../setup/test-app';
import { generationFixtures } from './generation-fixture';

let t: TestApp;
let fixture: ReturnType<typeof generationFixtures>;
let runner: BotRunnerService;
const provider = new FakeLlmProvider();
const generate = vi.spyOn(provider, 'generateTurn');
const now = new Date('2026-10-21T05:00:00Z');
beforeAll(async () => {
  t = await createTestApp({ overrides: [[LLM, provider]] });
  fixture = generationFixtures(t, now);
  await fixture.start();
  runner = t.app.get(BotRunnerService);
});
afterAll(async () => {
  await fixture.close();
  await t.close();
});

it.each([true, false])(
  'REQ-208 REQ-411 provider failure retryable=%s cannot advance or publish; explicit recovery posts once',
  async (retryable) => {
    generate.mockClear();
    const { thread, group } = await fixture.thread();
    const failure = new IntegrationError('fake', 'Controlled provider failure', retryable);
    generate.mockRejectedValueOnce(failure);
    await expect(runner.postTurn(thread.id, 0, now)).rejects.toBe(failure);
    expect(
      await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
    ).toMatchObject({
      status: thread.status,
      cursor: 0,
      nextAt: thread.nextAt,
      lines: thread.lines,
    });
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(0);
    expect(
      await t.prisma.db.botTurnDraft.findUniqueOrThrow({
        where: { threadId_turn: { threadId: thread.id, turn: 0 } },
      }),
    ).toMatchObject({ body: null, leaseUntil: now });
    expect(generate).toHaveBeenCalledTimes(1);

    // Explicit retry after the boundary recovers; this does not assert automatic retry of terminal errors.
    expect(await runner.postTurn(thread.id, 0, now, () => 0)).toBe(true);
    expect(await runner.postTurn(thread.id, 0, now, () => 0)).toBe(false);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await t.prisma.db.message.count({ where: { roomId: `${group.id}-general` } })).toBe(1);
    expect(
      await t.prisma.db.botThread.findUniqueOrThrow({ where: { id: thread.id } }),
    ).toMatchObject({ status: 'running', cursor: 1 });
  },
);
