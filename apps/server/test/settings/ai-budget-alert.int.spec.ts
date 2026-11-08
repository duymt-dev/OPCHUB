import { describe, expect, it } from 'vitest';
import { ADMIN_DIRECTORY_PORT, type AdminDirectoryPort } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { OutboxRelayService } from '@/common/outbox';
import { NotificationService } from '@/modules/notification';
import { AiBudgetNotifyHandler } from '@/modules/llm-config';
import { AiBudgetAlertService } from '@/modules/llm-config/services/ai-budget-alert.service';
import { aiOpsFixture } from '../helpers/ai-ops-fixture';
import { aiDraft } from '../helpers/ai-config';
import { createUser } from '../factories/user.factory';
import { AiBudgetProcessor } from '@/worker/processors/ai-budget.processor';

describe('D-138 durable budget threshold notifications', () => {
  const f = aiOpsFixture('TIP817-alert');
  const events = (type: string) =>
    f.t.prisma.db.outboxEvent.findMany({
      where: { type, createdAt: { gte: f.started } },
      select: { id: true, payload: true },
    });
  it('warns once across concurrent checks; relay/replay idempotent; raising budget re-arms', async () => {
    const settings = await f.save({ budget: 100, warnPct: 80 });
    await f.t.prisma.db.llmUsageMonth.create({ data: { month: f.month, cost: 80 } });
    const denied = await createUser(f.t, { adminPermissions: ['groups.view'] });
    const service = f.t.app.get(AiBudgetAlertService);
    await Promise.all([service.check(f.month, settings), service.check(f.month, settings)]);
    expect(await events('ai.budget_warned')).toHaveLength(1);
    const handler = new AiBudgetNotifyHandler(
      f.t.app.get<AdminDirectoryPort>(ADMIN_DIRECTORY_PORT),
      f.t.app.get(NotificationService),
      f.t.app.get<Env>(ENV),
    );
    const relay = f.t.app.get(OutboxRelayService);
    new AiBudgetProcessor(relay, handler).onApplicationBootstrap();
    await relay.relayOnce();
    const event = (await events('ai.budget_warned'))[0];
    if (!event) throw Error('Expected warning event');
    await handler.send(f.month, 'warn', event.id.toString(), 80);
    const prefix = `ai-budget:${f.month}:warn:${event.id}:`;
    expect(
      await f.t.prisma.db.notification.count({
        where: { userId: f.actor.id, id: { startsWith: prefix } },
      }),
    ).toBe(1);
    expect(
      await f.t.prisma.db.notification.count({
        where: { userId: denied.id, id: { startsWith: prefix } },
      }),
    ).toBe(0);
    const raised = await f.save({ budget: 200, warnPct: 80 });
    await f.t.prisma.db.llmUsageMonth.update({ where: { month: f.month }, data: { cost: 160 } });
    await service.check(f.month, raised);
    expect(await events('ai.budget_warned')).toHaveLength(2);
    await relay.relayOnce();
    const ids = (await events('ai.budget_warned')).map(
      (row) => `ai-budget:${f.month}:warn:${row.id}:${f.actor.id}`,
    );
    expect(
      await f.t.prisma.db.notification.count({ where: { userId: f.actor.id, id: { in: ids } } }),
    ).toBe(2);
  });
  it('exhausted stops bot and notifies once, content uses affordable fallback', async () => {
    const draft = aiDraft(f.a.url, 'stub', f.model);
    const providers = draft.providers.map((p) =>
      p.id === 'custom'
        ? { ...p, priceIn: 1000000 }
        : p.id === 'usgate'
          ? {
              ...p,
              enabled: true,
              baseUrl: f.b.url,
              model: `${f.model}-fallback`,
              key: 'stub-fallback',
            }
          : p,
    );
    await f.save({ budget: 10, fallback: 'usgate', providers });
    await f.t.prisma.db.llmUsageMonth.create({ data: { month: f.month, cost: 10 } });
    await f.t.redis.client.del(`llm:spend:${f.month}`);
    const n = f.a.requests.length;
    await expect(f.router.forPurpose('bot').complete('x')).rejects.toThrow(
      'Hết ngân sách AI tháng',
    );
    await expect(f.router.forPurpose('bot').complete('x')).rejects.toThrow(
      'Hết ngân sách AI tháng',
    );
    expect(f.a.requests).toHaveLength(n);
    expect(await events('ai.budget_exhausted')).toHaveLength(1);
    const bn = f.b.requests.length;
    await f.router.forPurpose('content').complete('x');
    expect(f.b.requests).toHaveLength(bn + 1);
    expect(await f.t.redis.client.get(`llm:reserved:${f.month}`)).toBe('0');
  });
});
