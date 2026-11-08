import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IntegrationError, type PushProvider } from '@opchub/integrations';
import { pushPreferencesSchema } from '@opchub/shared/api-domains';
import { PUSH } from '@/common/integrations/integrations.module';
import { AppSettingsService } from '@/modules/settings';
import { pushPayload } from '../domain/push-payload';
import {
  PushDeliveryRepository,
  subscriptionOf,
  type DeliveryOutcome,
  type DeliveryRow,
} from '../repositories/push-delivery.repository';
import { PushSubscriptionService } from './push-subscription.service';

@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);
  constructor(
    private readonly repo: PushDeliveryRepository,
    private readonly settings: AppSettingsService,
    private readonly subscriptions: PushSubscriptionService,
    @Inject(PUSH) private readonly provider: PushProvider,
  ) {}

  async send(ids: readonly string[], owner: string = randomUUID(), attempt = 0): Promise<void> {
    if (!ids.length) return;
    const app = await this.settings.app();
    if (!app.pwa || !this.subscriptions.configured()) {
      this.logger.debug('Bỏ qua đẩy: ứng dụng tắt hoặc provider chưa cấu hình');
      return;
    }
    const dispatches = await this.repo.dispatches(ids);
    const eligible = dispatches
      .filter((row) => {
        if (row.kind === 'test') return row.realm === 'admin';
        if (!app.push[row.kind]) return false;
        return (
          row.realm === 'admin' ||
          row.preferences === null ||
          pushPreferencesSchema.parse(row.preferences)[row.kind]
        );
      })
      .map((row) => row.notificationId);
    if (!eligible.length) return;
    const deliveries = await this.repo.claim(eligible, owner, attempt);
    const results: DeliveryOutcome[] = [];
    try {
      for (let start = 0; start < deliveries.length; start += 10) {
        results.push(
          ...(await Promise.all(deliveries.slice(start, start + 10).map((r) => this.deliver(r)))),
        );
      }
      await this.repo.finish(owner, attempt, results);
    } finally {
      await this.repo.release(owner, attempt);
    }
    if (results.some((r) => r.outcome === 'retry')) {
      // Never attach provider errors: SDK causes can contain endpoints and credentials.
      throw new IntegrationError('push', 'Dịch vụ đẩy tạm thời không sẵn sàng', true);
    }
  }

  private async deliver(row: DeliveryRow): Promise<DeliveryOutcome> {
    let outcome: DeliveryOutcome['outcome'];
    try {
      const result = await this.provider.send(
        subscriptionOf(row),
        pushPayload({ ...row, id: row.notificationId }),
        { ttl: 86400, urgency: row.kind === 'test' ? 'high' : 'normal' },
      );
      outcome = 'ok' in result ? 'ok' : 'gone' in result ? 'gone' : 'retry';
    } catch (error) {
      outcome = error instanceof IntegrationError && !error.retryable ? 'terminal' : 'retry';
    }
    return {
      notificationId: row.notificationId,
      subscriptionId: row.subscriptionId,
      createdAt: row.createdAt.toISOString(),
      outcome,
    };
  }
}
