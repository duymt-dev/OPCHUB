import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { jobs, type JobName, type JobQueue } from '@opchub/shared/queues';
import { type Job, Worker } from 'bullmq';
import type { z } from 'zod';
import { RedisService } from '../redis/redis.service';
import { BULL_PREFIX } from './queue.service';

type Handlers<Q extends JobQueue> = {
  [N in JobName<Q>]?: (data: z.infer<(typeof jobs)[Q][N]>, job: Job) => Promise<void>;
};

/**
 * Dựng BullMQ Worker cho process worker. Payload parse zod theo tên job trước khi gọi handler;
 * job không có handler → lỗi (giữ trong failed set để xem lại, queues-workers.md).
 */
@Injectable()
export class WorkerFactory implements OnApplicationShutdown {
  private readonly logger = new Logger(WorkerFactory.name);
  private readonly workers: Worker[] = [];

  constructor(private readonly redis: RedisService) {}

  start<Q extends JobQueue>(queue: Q, handlers: Handlers<Q>, concurrency = 5): Worker {
    const w = new Worker(
      queue,
      async (job: Job) => {
        const name = job.name as JobName<Q>;
        const handler = handlers[name];
        const schema = (jobs[queue] as Record<string, z.ZodType>)[job.name];
        if (!handler || !schema) throw new Error(`Không có handler cho ${queue}/${job.name}`);
        await handler(schema.parse(job.data) as never, job);
      },
      {
        connection: this.redis.duplicate({ prefix: '', blocking: true }),
        prefix: BULL_PREFIX,
        concurrency,
      },
    );
    w.on('failed', (job, err) =>
      this.logger.warn({ queue, job: job?.name, jobId: job?.id, err }, 'Job lỗi'),
    );
    this.workers.push(w);
    return w;
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
  }
}
