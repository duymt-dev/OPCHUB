import { describe, expect, it, vi } from 'vitest';
import { AiReservationService } from '@/modules/llm-config/services/ai-reservation.service';
import { aiOpsFixture } from '../helpers/ai-ops-fixture';
import { aiDraft } from '../helpers/ai-config';
import { AiBudgetService } from '@/modules/llm-config';

describe('D-138 AI cost reservations', () => {
  const f = aiOpsFixture('TIP817-reserve');
  it('expired old lease cannot decrement a new reservation', async () => {
    const service = f.t.app.get(AiReservationService);
    const old = await service.take(f.month, 10, 0);
    if (!old) throw Error('Expected unlimited lease');
    await f.t.redis.client.del(`llm:reserved:${f.month}`, `llm:reservations:${f.month}`);
    const current = await service.take(f.month, 5, 0);
    if (!current) throw Error('Expected current lease');
    await service.release(old);
    expect(await f.t.redis.client.get(`llm:reserved:${f.month}`)).toBe('5');
    await service.release(current);
    expect(await f.t.redis.client.get(`llm:reserved:${f.month}`)).toBe('0');
  });
  it('durable accounting failure neither retries a paid call nor releases its protective lease', async () => {
    const cfg = await f.save();
    await f.save({
      budget: 1000,
      fallback: 'usgate',
      providers: cfg.providers.map((p) => ({
        id: p.id,
        enabled: p.enabled,
        baseUrl: p.baseUrl,
        model: p.model,
        priceIn: p.id === 'custom' ? 1000000 : p.priceIn,
        priceOut: p.priceOut,
      })),
    });
    const n = f.a.requests.length,
      bn = f.b.requests.length;
    const spy = vi
      .spyOn(f.t.app.get(AiBudgetService), 'record')
      .mockRejectedValueOnce(Error('accounting failed'));
    try {
      await expect(f.router.forPurpose('content').complete('test')).rejects.toThrow(
        'accounting failed',
      );
      expect(f.a.requests).toHaveLength(n + 1);
      expect(f.b.requests).toHaveLength(bn);
      expect(Number(await f.t.redis.client.get(`llm:reserved:${f.month}`))).toBeGreaterThan(0);
      const ttl = await f.t.redis.client.ttl(`llm:reserved:${f.month}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(900);
    } finally {
      spy.mockRestore();
    }
  });
  it('concurrent calls cannot overshoot budget', async () => {
    const draft = aiDraft(f.a.url, 'stub-key', f.model);
    await f.save({
      budget: 101,
      maxTokens: 16,
      providers: draft.providers.map((p) =>
        p.id === 'custom' ? { ...p, priceIn: 1000000, priceOut: 6250000 } : p,
      ),
    });
    f.a.setDelay(500);
    f.a.setUsage({ prompt_tokens: 1, completion_tokens: 16 });
    const n = f.a.requests.length;
    const result = await Promise.allSettled(
      Array.from({ length: 5 }, () => f.router.forPurpose('content').complete('x')),
    );
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(f.a.requests).toHaveLength(n + 1);
    expect(await f.t.redis.client.get(`llm:reserved:${f.month}`)).toBe('0');
    expect(
      (await f.t.prisma.db.llmUsageMonth.findUniqueOrThrow({ where: { month: f.month } })).cost,
    ).toBe(101n);
  });
  it('releases after provider error and refuses all physical calls when Redis is unavailable', async () => {
    f.a.setMode('unauthorized');
    await expect(f.router.forPurpose('content').complete('x')).rejects.toThrow('401');
    expect(await f.t.redis.client.get(`llm:reserved:${f.month}`)).toBe('0');
    const n = f.a.requests.length;
    const evalSpy = vi.spyOn(f.t.redis.client, 'get').mockRejectedValueOnce(Error('offline'));
    try {
      await expect(f.router.forPurpose('content').complete('x')).rejects.toThrow(
        'reservation unavailable',
      );
      expect(f.a.requests).toHaveLength(n);
    } finally {
      evalSpy.mockRestore();
    }
  });
  it('zero-price requests remain usable at budget and expired/duplicate releases cannot go negative', async () => {
    await f.save({ budget: 1 });
    await f.t.prisma.db.llmUsageMonth.create({ data: { month: f.month, cost: 100 } });
    await f.router.forPurpose('content').complete('free');
    const service = f.t.app.get(AiReservationService);
    const lease = await service.take(f.month, 0, 1);
    expect(lease).not.toBeNull();
    if (!lease) throw Error('Expected zero-price lease');
    await service.release(lease);
    await service.release(lease);
    expect(await f.t.redis.client.get(`llm:reserved:${f.month}`)).toBe('0');
  });
});
