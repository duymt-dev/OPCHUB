import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { jobs, type JobName, type JobQueue, MAIL_ATTEMPTS } from '@opchub/shared/queues';
import { type JobsOptions, Queue } from 'bullmq';
import type { z } from 'zod';
import { RedisService } from '../redis/redis.service';
import { MAIL_BACKOFF } from './backoff';
import { removePendingBefore } from './pending-cleanup';

/** Prefix BullMQ riêng (BullMQ không dùng keyPrefix của ioredis) */
export const BULL_PREFIX = 'opchub:bull';

/**
 * Retry mặc định theo queue (queues-workers.md). `mail` (NA-05): 1 lần đầu + 3 lần thử lại cách
 * 1 / 5 / 15 phút — backoff tuỳ biến `mail` (backoff.ts, WorkerFactory gắn `settings`).
 */
const DEFAULT_OPTS: Partial<Record<JobQueue, JobsOptions>> = {
  mail: { attempts: MAIL_ATTEMPTS, backoff: { type: MAIL_BACKOFF } },
  reconcile: { attempts: 3, backoff: { type: 'exponential', delay: 2_000 } },
  scheduler: { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
  export: { attempts: 2 },
  bot: { attempts: 2 },
};

type Payload<Q extends JobQueue, N extends JobName<Q>> = z.infer<(typeof jobs)[Q][N]>;

/**
 * Producer BullMQ dùng chung. Payload parse zod trước khi đẩy; chỉ gọi từ handler outbox
 * hoặc scheduler — nghiệp vụ không enqueue trực tiếp (hiệu ứng phụ đi qua outbox).
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<JobQueue, Queue>();

  constructor(private readonly redis: RedisService) {}

  async add<Q extends JobQueue, N extends JobName<Q>>(
    queue: Q,
    name: N,
    payload: Payload<Q, N>,
    opts: JobsOptions = {},
  ): Promise<void> {
    const schema = jobs[queue][name] as z.ZodType;
    const data: unknown = schema.parse(payload);
    await this.queue(queue).add(name, data, {
      removeOnComplete: 1_000,
      removeOnFail: false,
      ...DEFAULT_OPTS[queue],
      ...opts,
    });
  }

  /** Lịch định kỳ (idempotent theo `id` — nhiều worker khởi động vẫn một lịch) */
  removePendingBefore(queue: JobQueue, names: readonly string[], cutoff: number) {
    return removePendingBefore(this.queue(queue), this.redis.client, names, cutoff);
  }

  async schedule(
    queue: JobQueue,
    id: string,
    name: string,
    repeat: { pattern?: string; tz?: string; every?: number },
  ): Promise<void> {
    await this.queue(queue).upsertJobScheduler(id, repeat, {
      name,
      data: {},
      opts: { removeOnComplete: 100, removeOnFail: 500, ...DEFAULT_OPTS[queue] },
    });
  }

  /** Gỡ lịch định kỳ (không còn thì bỏ qua) */
  async unschedule(queue: JobQueue, id: string): Promise<void> {
    await this.queue(queue).removeJobScheduler(id);
  }

  private queue(name: JobQueue): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.redis.duplicate({ prefix: '' }),
        prefix: BULL_PREFIX,
      });
      this.queues.set(name, q);
    }
    return q;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
