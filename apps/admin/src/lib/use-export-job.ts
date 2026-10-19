'use client';

import { type ExportStatus, exportStatusSchema } from '@opchub/shared/api-domains';
import { useCallback } from 'react';
import { api, ApiError } from './api-client';

/**
 * Job xuất dữ liệu (NA-14, BUG-013, B43): `POST …/export` trả `jobId` → hỏi `GET /admin/exports/:id`
 * mỗi 1,5 giây (tối đa 60 giây) → `done` thì tải file từ `url` (link ký 1 giờ; server ghi audit
 * `export.download` mỗi lần trả link). Dùng chung cho mọi màn xuất (Thành viên, nhóm — B43).
 */
export const EXPORT_POLL_MS = 1_500;
export const EXPORT_WAIT_MS = 60_000;

export type ExportOutcome =
  | { kind: 'done'; rows: number; url: string }
  | { kind: 'failed' }
  | { kind: 'timeout' }
  | { kind: 'error'; message: string };

export interface PollDeps {
  fetchStatus: (id: string) => Promise<ExportStatus>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

/** Hỏi tới khi xong; lỗi mạng → thử tiếp tới hết hạn chờ; 4xx (vd 404) → dừng, giữ lý do server */
export async function waitForExport(
  jobId: string,
  deps: PollDeps,
  opts: { pollMs?: number; waitMs?: number } = {},
): Promise<ExportOutcome> {
  const pollMs = opts.pollMs ?? EXPORT_POLL_MS;
  const deadline = deps.now() + (opts.waitMs ?? EXPORT_WAIT_MS);
  for (;;) {
    try {
      const s = await deps.fetchStatus(jobId);
      if (s.status === 'done' && s.url) return { kind: 'done', rows: s.rowCount ?? 0, url: s.url };
      if (s.status === 'failed') return { kind: 'failed' };
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        return { kind: 'error', message: e.message };
      }
    }
    if (deps.now() + pollMs > deadline) return { kind: 'timeout' };
    await deps.sleep(pollMs);
  }
}

const fileNameOf = (url: string) =>
  decodeURIComponent(new URL(url, window.location.href).pathname.split('/').pop() || 'export.csv');

/**
 * Tải file về máy: lấy blob rồi `<a download>` (đặt được tên file); link khác origin không cho đọc
 * (CORS) → mở thẳng `<a href download>` (file ký sẵn `Content-Disposition` khi dùng S3).
 */
export async function downloadUrl(url: string, name = fileNameOf(url)): Promise<void> {
  const a = document.createElement('a');
  a.download = name;
  let blobUrl: string | null = null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    blobUrl = URL.createObjectURL(await res.blob());
    a.href = blobUrl;
  } catch {
    a.href = url;
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (blobUrl) URL.revokeObjectURL(blobUrl);
}

export const fetchExportStatus = (id: string) =>
  api(`/admin/exports/${encodeURIComponent(id)}`, { schema: exportStatusSchema });

const realDeps: PollDeps = {
  fetchStatus: fetchExportStatus,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
};

/** `run(jobId)` chờ job xong rồi tải file; trả kết quả để màn gọi hiện toast của mình */
export function useExportJob() {
  return useCallback(async (jobId: string): Promise<ExportOutcome> => {
    const out = await waitForExport(jobId, realDeps);
    if (out.kind === 'done') await downloadUrl(out.url);
    return out;
  }, []);
}
