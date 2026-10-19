import type { ExportStatus } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import { waitForExport } from './use-export-job';

const st = (over: Partial<ExportStatus>): ExportStatus => ({
  id: 'j1',
  kind: 'users',
  status: 'queued',
  rowCount: null,
  url: null,
  expiresInSec: null,
  ...over,
});

/** Đồng hồ giả: sleep cộng thời gian, không chờ thật */
function deps(seq: (() => Promise<ExportStatus>)[]) {
  let t = 0;
  let i = 0;
  return {
    calls: () => i,
    fetchStatus: () => {
      const f = seq[Math.min(i, seq.length - 1)];
      i += 1;
      return f ? f() : Promise.reject(new Error('no step'));
    },
    sleep: (ms: number) => {
      t += ms;
      return Promise.resolve();
    },
    now: () => t,
  };
}

describe('REQ-214 BUG-013 waitForExport (poll 1,5 giây, tối đa 60 giây)', () => {
  it('queued → running → done trả url + số dòng', async () => {
    const d = deps([
      () => Promise.resolve(st({})),
      () => Promise.resolve(st({ status: 'running' })),
      () => Promise.resolve(st({ status: 'done', rowCount: 3, url: 'https://x/e.csv' })),
    ]);
    expect(await waitForExport('j1', d)).toEqual({ kind: 'done', rows: 3, url: 'https://x/e.csv' });
    expect(d.calls()).toBe(3);
  });

  it('failed → dừng ngay', async () => {
    const d = deps([() => Promise.resolve(st({ status: 'failed' }))]);
    expect(await waitForExport('j1', d)).toEqual({ kind: 'failed' });
  });

  it('lỗi mạng → thử tiếp; quá 60 giây → timeout', async () => {
    const d = deps([() => Promise.reject(new TypeError('Failed to fetch'))]);
    expect(await waitForExport('j1', d)).toEqual({ kind: 'timeout' });
    expect(d.calls()).toBe(41);
  });

  it('404 → dừng, giữ lý do server', async () => {
    const e = new ApiError('NOT_FOUND', 404, 'Không tìm thấy yêu cầu xuất');
    const d = deps([() => Promise.reject(e)]);
    expect(await waitForExport('j1', d)).toEqual({
      kind: 'error',
      message: 'Không tìm thấy yêu cầu xuất',
    });
  });
});
