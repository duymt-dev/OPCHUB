import { Injectable } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { QueueService } from '@/common/queue';
import { AppSettingsService } from '@/modules/settings';

@Injectable()
export class BotEmergencyCleanupService {
  constructor(
    private readonly queue: QueueService,
    private readonly settings: AppSettingsService,
  ) {}

  async handle(at: string): Promise<void> {
    await this.settings.invalidate('bot');
    await this.queue.removePendingBefore(QUEUES.bot, ['postTurn', 'reply'], Date.parse(at));
  }
}
