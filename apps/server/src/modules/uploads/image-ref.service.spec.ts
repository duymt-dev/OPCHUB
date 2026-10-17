import type { ObjectHead, StorageProvider } from '@opchub/integrations';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/common/errors';
import { ImageRefService } from './image-ref.service';

const BASE = 'http://files.test/opchub/';

function fakeStorage(objects: Record<string, ObjectHead>): StorageProvider {
  return {
    name: 'fake',
    presignPut: () => Promise.resolve(''),
    presignGet: () => Promise.resolve(''),
    head: (key) => Promise.resolve(objects[key] ?? null),
    put: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    publicUrl: (key) => `${BASE}${key}`,
  };
}

const svc = new ImageRefService(
  fakeStorage({
    'project-cover/u1/a.png': { size: 1000, contentType: 'image/png' },
    'project-cover/u1/big.png': { size: 6 * 1024 * 1024, contentType: 'image/png' },
    'project-cover/u1/doc.pdf': { size: 100, contentType: 'application/pdf' },
  }),
);
const base = { userId: 'u1', kind: 'project-cover' as const, path: 'coverUrl' };

async function message(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof AppError ? e.message : 'other';
  }
}

describe('ImageRefService', () => {
  it('rỗng → null, giữ nguyên giá trị đang lưu', async () => {
    expect(await svc.resolve({ ...base, url: '' })).toBeNull();
    expect(await svc.resolve({ ...base, url: null })).toBeNull();
    const cur = 'https://images.unsplash.com/x';
    expect(await svc.resolve({ ...base, url: cur, current: cur })).toBe(cur);
  });

  it('data URL ảnh hợp lệ giữ nguyên, kiểu khác bị chặn', async () => {
    const ok = 'data:image/png;base64,iVBORw0KGgo=';
    expect(await svc.resolve({ ...base, url: ok })).toBe(ok);
    expect(await message(svc.resolve({ ...base, url: 'data:text/html;base64,PGI+' }))).toBe(
      'Ảnh không hợp lệ',
    );
  });

  it('object của chính mình đã tải → nhận; của người khác / chưa tải / sai kiểu → 400', async () => {
    expect(await svc.resolve({ ...base, url: `${BASE}project-cover/u1/a.png` })).toBe(
      `${BASE}project-cover/u1/a.png`,
    );
    expect(await message(svc.resolve({ ...base, url: `${BASE}project-cover/u2/a.png` }))).toBe(
      'Ảnh không hợp lệ',
    );
    expect(await message(svc.resolve({ ...base, url: `${BASE}avatar/u1/a.png` }))).toBe(
      'Ảnh không hợp lệ',
    );
    expect(await message(svc.resolve({ ...base, url: `${BASE}project-cover/u1/none.png` }))).toBe(
      'Ảnh chưa được tải lên',
    );
    expect(await message(svc.resolve({ ...base, url: `${BASE}project-cover/u1/big.png` }))).toMatch(
      /tối đa 5MB/,
    );
    expect(await message(svc.resolve({ ...base, url: `${BASE}project-cover/u1/doc.pdf` }))).toMatch(
      /PNG/,
    );
  });

  it('URL ngoài storage mới gửi → 400', async () => {
    expect(await message(svc.resolve({ ...base, url: 'https://evil.example/x.png' }))).toBe(
      'Ảnh không hợp lệ',
    );
  });
});
