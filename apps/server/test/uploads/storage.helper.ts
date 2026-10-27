import { LocalStorageProvider } from '@opchub/integrations';
import { type UploadKind, presignResultSchema } from '@opchub/shared/api-domains';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestApp } from '../setup/test-app';

/** Gốc URL giả của provider local — test đổi về đường app `/uploads/<key>?…` khi gọi */
export const STORAGE_BASE = 'http://media.local/v1';

export interface TempStorage {
  provider: LocalStorageProvider;
  root: string;
  dispose: () => Promise<void>;
}

/** `LocalStorageProvider` trên thư mục tạm (TIP-V2-102: không cần MinIO cho int test) */
export async function tempStorage(): Promise<TempStorage> {
  const root = await mkdtemp(join(tmpdir(), 'opchub-media-'));
  const provider = new LocalStorageProvider({
    root,
    baseUrl: `${STORAGE_BASE}/uploads`,
    signingKey: 'm'.repeat(40),
  });
  return { provider, root, dispose: () => rm(root, { recursive: true, force: true }) };
}

/** PNG giả `size` byte (đầu PNG + đệm) — sinh trong test, không thêm tệp nhị phân vào repo */
export function pngBytes(size: number): Uint8Array {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
}

/** Tệp giả `size` byte có chữ ký đúng MIME (D-117 B5 kiểm byte đầu) */
export function fileBytes(contentType: string, size: number): Uint8Array {
  const b = new Uint8Array(size).fill(65);
  const head: Record<string, number[]> = {
    'application/pdf': [...'%PDF-1.7'].map((c) => c.charCodeAt(0)),
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'application/zip': [0x50, 0x4b, 0x03, 0x04],
  };
  b.set((head[contentType] ?? []).slice(0, size));
  return b;
}

/** URL tuyệt đối của provider → đường cho `t.call` (khoá mã hoá một đoạn, như contract storage) */
export function appPath(url: string): string {
  const u = new URL(url);
  const key = u.pathname.replace(/^\/v1\/uploads\//, '');
  return `/uploads/${encodeURIComponent(decodeURIComponent(key))}${u.search}`;
}

/** presign → PUT đúng như FE `uploadImage` → trả `publicUrl` */
export async function uploadPng(
  t: TestApp,
  token: string,
  kind: UploadKind,
  size = 300 * 1024,
): Promise<string> {
  const body = pngBytes(size);
  const r = await t.call('/uploads/presign', {
    method: 'POST',
    token,
    json: { kind, contentType: 'image/png', size: body.length },
  });
  if (r.status !== 200) throw new Error(`presign ${String(r.status)}`);
  const signed = presignResultSchema.parse(await r.json());
  const put = await t.call(appPath(signed.uploadUrl), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': 'image/png' },
  });
  if (put.status !== 200) throw new Error(`PUT ${String(put.status)}`);
  return signed.publicUrl;
}
