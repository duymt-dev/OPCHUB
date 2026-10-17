import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LocalStorageProvider } from './local.provider';

describe('LocalStorageProvider (dev/e2e)', () => {
  let root: string;
  let s: LocalStorageProvider;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'opchub-local-'));
    s = new LocalStorageProvider({
      root,
      baseUrl: 'http://h/v1/uploads',
      signingKey: 'k'.repeat(32),
    });
  });
  afterAll(() => rm(root, { recursive: true, force: true }));

  it('put → head → read → delete', async () => {
    await s.put('avatar/u1/a.png', Buffer.from('abc'), 'image/png');
    expect(await s.head('avatar/u1/a.png')).toEqual({ size: 3, contentType: 'image/png' });
    expect((await s.read('avatar/u1/a.png'))?.body.toString()).toBe('abc');
    await s.delete('avatar/u1/a.png');
    expect(await s.head('avatar/u1/a.png')).toBeNull();
  });

  it('URL PUT ký đúng key + kiểu + kích thước; sửa một phần → từ chối', async () => {
    const url = new URL(await s.presignPut('avatar/u1/b.png', 'image/png', 10));
    const q = Object.fromEntries(url.searchParams);
    expect(s.verifyPut('avatar/u1/b.png', q, 10)).toBe(true);
    expect(s.verifyPut('avatar/u1/b.png', q, 11)).toBe(false);
    expect(s.verifyPut('avatar/u2/b.png', q, 10)).toBe(false);
    expect(s.verifyPut('avatar/u1/b.png', { ...q, exp: '1' }, 10)).toBe(false);
  });

  it('chặn thoát thư mục gốc', async () => {
    await expect(s.put('../x.png', 'a', 'image/png')).rejects.toThrow();
  });
});
