import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { QUEUES } from '@opchub/shared/queues';
import { QueueService } from '@/common/queue';

@Injectable()
export class BotReplyQueueService {
  constructor(private readonly queue: QueueService) {}

  async enqueue(payload: OutboxPayload<'bot.reply_run_due'>) {
    const timestamp = Date.now();
    await this.queue.add(
      QUEUES.bot,
      'replyRun',
      { runId: payload.runId, cursor: payload.cursor },
      {
        jobId: `bot-reply-run-${payload.runId}-${payload.cursor}`,
        timestamp,
        delay: Math.max(0, Date.parse(payload.at) - timestamp),
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: true, // Periodic recovery can retry transient DB/queue failures from durable state.
      },
    );
  }
}
