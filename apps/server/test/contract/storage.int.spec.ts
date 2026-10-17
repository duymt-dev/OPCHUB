import { LocalStorageProvider } from '@opchub/integrations';
import { presignResultSchema } from '@opchub/shared/api-domains';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { STORAGE } from '@/common/integrations';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/** Gốc URL giả của provider local — đổi về đường app `/uploads/<key>?…` khi gọi */
const BASE = 'http://contract.local/v1';
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

/**
 * URL tuyệt đối của provider → đường cho `t.call` (bỏ `/v1`). Khoá chứa `/` nên mã hoá thành
 * một đoạn (`%2F`) để khớp mẫu `/uploads/:key`; Express giải mã lại đúng khoá đã ký.
 */
const appPath = (url: string) => {
  const u = new URL(url);
  const key = u.pathname.replace(/^\/v1\/uploads\//, '');
  return `/uploads/${encodeURIComponent(decodeURIComponent(key))}${u.search}`;
};

/** Contract `storage` (3) — presign như apps/portal/src/features/profile/api.ts, PUT/GET local */
describe('Contract: storage', () => {
  let t: TestApp;
  let root: string;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'opchub-contract-'));
    const provider = new LocalStorageProvider({
      root,
      baseUrl: `${BASE}/uploads`,
      signingKey: 'x'.repeat(40),
    });
    t = await createTestApp({ overrides: [[STORAGE, provider]] });
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
    await rm(root, { recursive: true, force: true });
  });

  it('presign → PUT tệp đã ký → GET đúng byte', async () => {
    const tk = await tokenOf(t, await createUser(t));
    const signed = await ep(
      t,
      'POST',
      '/uploads/presign',
      '/uploads/presign',
      presignResultSchema,
      {
        token: tk,
        json: { kind: 'avatar', contentType: 'image/png', size: PNG.length },
      },
    );
    const put = appPath(signed.data.uploadUrl);
    await ep(t, 'PUT', '/uploads/:key', put, z.object({ key: z.string() }), {
      body: Uint8Array.from(PNG),
      headers: { 'Content-Type': 'image/png' },
    });
    const get = appPath(signed.data.publicUrl);
    await ep(t, 'GET', '/uploads/:key', get, null, { token: tk });
    const res = await t.call(get, { token: tk });
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
  });
});
