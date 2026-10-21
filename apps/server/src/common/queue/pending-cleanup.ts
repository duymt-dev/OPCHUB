import { randomUUID } from 'node:crypto';
import type { Job, Queue } from 'bullmq';
import type { Redis } from 'ioredis';

const leaseMs = 30_000;
const renew = `if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end return 0`;
const unlock = `if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1]) end return 0`;

/** Paged removal, never obliterate/drain: retain schedulers, active work and unrelated jobs. */
export async function removePendingBefore(
  queue: Queue,
  redis: Redis,
  names: readonly string[],
  cutoff: number,
): Promise<number> {
  const key = `queue:cleanup:${queue.name}`;
  const recovery = `${key}:was-paused`;
  const token = randomUUID();
  if (!(await redis.set(key, token, 'PX', leaseMs, 'NX')))
    throw new Error('Pending queue cleanup already running');
  let removed = 0;
  try {
    // Persist original state before pause: an outbox retry can recover a crashed consumer.
    await redis.set(recovery, (await queue.isPaused()) ? '1' : '0', 'NX');
    await queue.pause();
    const heartbeat = async () => {
      if (!(await redis.eval(renew, 1, key, token, String(leaseMs))))
        throw new Error('Pending queue cleanup lease lost');
    };
    for (const state of ['delayed', 'prioritized', 'waiting-children', 'waiting'] as const) {
      removed += await prune(
        (start) => queue.getJobs([state], start, start + 99, true),
        names,
        cutoff,
        heartbeat,
      );
    }
    // BullMQ's public JobType excludes paused, so read only its bounded ID list, then public jobs.
    const client = await queue.getBackend().client;
    removed += await prune(
      async (start) => {
        const ids = await client.lrange(queue.toKey('paused'), start, start + 99);
        const rows = await Promise.all(ids.map((id) => queue.getJob(id)));
        return rows.filter((job): job is Job => !!job);
      },
      names,
      cutoff,
      heartbeat,
    );
    await heartbeat();
    if ((await redis.get(recovery)) === '0') await queue.resume();
    await redis.del(recovery);
    return removed;
  } finally {
    // On errors keep recovery marker; durable consumer retries, restores original pause state.
    await redis.eval(unlock, 1, key, token);
  }
}

async function prune(
  page: (start: number) => Promise<Job[]>,
  names: readonly string[],
  cutoff: number,
  heartbeat: () => Promise<void>,
): Promise<number> {
  let offset = 0;
  let removed = 0;
  for (;;) {
    await heartbeat();
    const jobs = await page(offset);
    if (!jobs.length) return removed;
    for (const job of jobs) {
      if (names.includes(job.name) && job.timestamp <= cutoff) {
        await job.remove();
        removed++;
      } else offset++;
    }
  }
}
