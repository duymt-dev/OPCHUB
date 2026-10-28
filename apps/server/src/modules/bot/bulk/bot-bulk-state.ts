import type { BotBulkError } from '@opchub/shared/api-domains';
import type { BulkBatchRow } from './bot-bulk.repository';
import { conflict } from '@/common/errors';

const released = { claimId: null, leaseUntil: null };
export function advanceBulk(batch: BulkBatchRow, now: Date) {
  if (batch.status !== 'running' || batch.cursor >= batch.total)
    throw conflict('Đợt tạo không còn chạy');
  const cursor = batch.cursor + 1;
  return {
    ...released,
    cursor,
    attempts: 0,
    error: null,
    status: cursor === batch.total ? 'done' : 'running',
    nextAt: cursor === batch.total ? null : now,
  };
}
export function failBulk(batch: BulkBatchRow, error: BotBulkError, retryable: boolean, now: Date) {
  if (batch.status !== 'running') throw conflict('Đợt tạo không còn chạy');
  if (retryable && batch.attempts < 3) {
    return {
      ...released,
      status: 'running',
      error: null,
      nextAt: new Date(now.getTime() + (error === 'provider' ? 60_000 : 1000)),
    };
  }
  return { ...released, status: 'failed', error, nextAt: null };
}
export function retryBulk(batch: BulkBatchRow, now: Date) {
  if (batch.status !== 'failed') throw conflict('Chỉ thử lại đợt tạo đã báo lỗi');
  return { ...released, status: 'running', attempts: 0, error: null, nextAt: now };
}
