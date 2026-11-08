import { describe, expect, it, vi } from 'vitest';
import { IntegrationError } from '@opchub/integrations';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '@opchub/shared/api-domains';
import type { RedisService } from '@/common/redis/redis.service';
import type { AiConfigCache } from '../ai-config-cache';
import type { AiBudgetService } from './ai-budget.service';
import { AiRouterService } from './ai-router.service';
import type { AiReservationService } from './ai-reservation.service';
import type { AiBudgetAlertService } from './ai-budget-alert.service';

function fixture() {
  const settings: AiSettings = {
    ...DEFAULT_AI_SETTINGS,
    budget: 0,
    fallback: '',
    use: { bot: 'custom', script: '', content: '', mod: '' },
  };
  const providers: Awaited<ReturnType<AiConfigCache['snapshot']>>['providers'] = [
    {
      id: 'custom',
      enabled: true,
      baseUrl: 'http://127.0.0.1:1',
      model: 'unit',
      keyEnc: Uint8Array.from([1]),
      status: 'ok',
      checkedAt: null,
      priceIn: 0,
      priceOut: 0,
      updatedAt: new Date('2026-11-01T00:00:00Z'),
    },
  ];
  const cache = {
    snapshot: vi.fn<AiConfigCache['snapshot']>().mockResolvedValue({ settings, providers }),
    key: vi.fn<AiConfigCache['key']>().mockReturnValue(null),
  };
  const budget = { spend: vi.fn<AiBudgetService['spend']>().mockResolvedValue(0) };
  const evalRequest = vi.fn<RedisService['client']['eval']>().mockResolvedValue(1);
  const reservations = {
    take: vi
      .fn<AiReservationService['take']>()
      .mockResolvedValue({ month: '2026-11', token: 'unit' }),
    release: vi.fn<AiReservationService['release']>().mockResolvedValue(),
  };
  const alerts = { check: vi.fn<AiBudgetAlertService['check']>().mockResolvedValue() };
  const router = new AiRouterService(
    cache as unknown as AiConfigCache,
    budget as unknown as AiBudgetService,
    { client: { eval: evalRequest } } as unknown as RedisService,
    reservations as unknown as AiReservationService,
    alerts as unknown as AiBudgetAlertService,
  );
  return { settings, cache, budget, evalRequest, reservations, alerts, router };
}

async function failure(router: AiRouterService): Promise<IntegrationError> {
  const error: unknown = await router
    .forPurpose('bot')
    .complete('A5')
    .catch((e: unknown) => e);
  expect(error).toBeInstanceOf(IntegrationError);
  if (!(error instanceof IntegrationError)) throw Error('Expected terminal integration failure');
  expect(error.retryable).toBe(false);
  return error;
}

describe('A5 router failure classification', () => {
  it.each([true, false])(
    'classifies absent selection/provider (selectionMissing=%s)',
    async (missing) => {
      const f = fixture();
      if (missing) f.settings.use.bot = '';
      expect((await failure(f.router)).reason).toBe('not_configured');
      expect(f.evalRequest).not.toHaveBeenCalled();
    },
  );
  it('A5 missing key at the attempt boundary retains not_configured reason', async () => {
    const f = fixture();
    f.cache.key.mockReturnValueOnce('present-at-routing');
    expect((await failure(f.router)).reason).toBe('not_configured');
    expect(f.cache.key).toHaveBeenCalledTimes(2);
    expect(f.evalRequest).not.toHaveBeenCalled();
    expect(f.reservations.take).not.toHaveBeenCalled();
  });
  it('does not classify an exhausted budget as missing configuration', async () => {
    const f = fixture();
    f.settings.budget = 1;
    f.budget.spend.mockResolvedValue(1);
    f.cache.key.mockReturnValue('unit-key');
    f.reservations.take.mockResolvedValue(null);
    expect((await failure(f.router)).reason).toBe('budget_exhausted');
    expect(f.alerts.check).toHaveBeenCalledWith(expect.any(String), f.settings, true);
    expect(f.evalRequest).not.toHaveBeenCalled();
  });
});
