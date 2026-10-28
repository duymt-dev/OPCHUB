import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { QUEUES } from '@opchub/shared/queues';
import { QueueService } from '@/common/queue';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BotBulkRepository } from './bot-bulk.repository';

@Injectable()
export class BotBulkQueueService {
  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
    private readonly repository: BotBulkRepository,
  ) {}
  async enqueue(payload: OutboxPayload<'bot.bulk_due'>): Promise<void> {
    const timestamp = Date.now();
    await this.queue.add(
      QUEUES.bot,
      'bulkGenerate',
      {
        batchId: payload.batchId,
        cursor: payload.cursor,
        attempt: payload.attempt,
      },
      {
        jobId: `bot-bulk-${payload.batchId}-${payload.cursor}-${payload.attempt}`,
        timestamp,
        delay: Math.max(0, Date.parse(payload.at) - timestamp),
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
  async recover(now = new Date()): Promise<void> {
    const rows = await this.repository.recoverable(this.prisma.db, now);
    await Promise.all(
      rows.map((row) =>
        this.enqueue({
          batchId: row.id,
          cursor: row.cursor,
          attempt: row.attempts,
          at: row.nextAt.toISOString(),
        }),
      ),
    );
  }
}
