import { Injectable } from '@nestjs/common';
import type { AiSettings } from '@opchub/shared/api-domains';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AiBudgetAlertRepository } from '../repositories/ai-budget-alert.repository';

@Injectable()
export class AiBudgetAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AiBudgetAlertRepository,
    private readonly outbox: OutboxService,
  ) {}
  async check(month: string, settings: AiSettings, refused = false): Promise<void> {
    await this.prisma.db.$transaction(async (tx) => {
      const current = await this.alerts.current(tx);
      if (current.budget === 0) return;
      const [claimed] = await this.alerts.claim(
        tx,
        month,
        current,
        refused && current.budget === settings.budget,
      );
      if (claimed?.warn)
        await this.outbox.add(tx, 'ai.budget_warned', { month, pct: current.warnPct });
      if (claimed?.exhausted) await this.outbox.add(tx, 'ai.budget_exhausted', { month });
    });
  }
}
