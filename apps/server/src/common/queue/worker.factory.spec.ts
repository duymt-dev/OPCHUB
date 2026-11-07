import { Logger } from '@nestjs/common';
import { IntegrationError } from '@opchub/integrations';
import { UnrecoverableError, type Job } from 'bullmq';
import type * as BullMq from 'bullmq';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../redis/redis.service';
import { WorkerFactory } from './worker.factory';

const state = vi.hoisted(() => ({
  failed: null as ((job: Job | undefined, error: Error) => void) | null,
}));
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof BullMq>();
  return {
    ...actual,
    Worker: class {
      on(event: string, callback: (job: Job | undefined, error: Error) => void) {
        if (event === 'failed') state.failed = callback;
        return this;
      }
      close() {
        return Promise.resolve();
      }
    },
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  state.failed = null;
});

async function report(error: Error) {
  const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  const redis = { duplicate: vi.fn(() => ({})) } as unknown as RedisService;
  const factory = new WorkerFactory(redis);
  factory.start('bot', {});
  if (!state.failed) throw Error('Worker did not install its failure listener');
  state.failed({ id: 'A5-job', name: 'postTurn' } as Job, error);
  await factory.onApplicationShutdown();
  return { warn, debug };
}

describe('A5 worker failure severity preserves failure semantics', () => {
  it.each([false, true])('A5 not configured logs debug (wrapped=%s)', async (wrapped) => {
    const original = new IntegrationError('admin-configured-llm', 'Chưa cấu hình AI', false, {
      reason: 'not_configured',
    });
    const error = wrapped ? new UnrecoverableError(original.message) : original;
    if (wrapped) error.cause = original;
    const { warn, debug } = await report(error);
    expect(warn).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ queue: 'bot', jobId: 'A5-job', err: error }),
      'Job lỗi',
    );
  });

  it.each([
    new IntegrationError('configured-provider', 'HTTP401', false),
    new IntegrationError('configured-provider', 'Timeout', true),
    new IntegrationError('admin-configured-llm', 'Hết ngân sách AI tháng', false),
  ])('keeps unrelated provider failures at warn: $message', async (error) => {
    const { warn, debug } = await report(error);
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ err: error }),
      'Job lỗi',
    );
    expect(debug).not.toHaveBeenCalled();
  });

  it('does not loop on an unrelated cyclic cause', async () => {
    const error = new Error('Cycle');
    error.cause = error;
    const { warn, debug } = await report(error);
    expect(warn).toHaveBeenCalledOnce();
    expect(debug).not.toHaveBeenCalled();
  });
});
