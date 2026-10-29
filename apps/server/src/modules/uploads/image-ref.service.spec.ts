import type { ObjectHead, StorageProvider } from '@opchub/integrations';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/common/errors';
import { ImageRefService } from './image-ref.service';

const BASE = 'http://files.test/opchub/';

const PDF = Buffer.from('%PDF-1.7');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAGIC: Record<string, Buffer> = {
  'application/pdf': PDF,
  'image/png': PNG,
  'application/zip': Buffer.from('PK'),
};
/** Object có `body` riêng (B5) — mặc định byte đầu đúng chữ ký theo MIME */
type Obj = ObjectHead & { body?: Buffer };
const deleted: string[] = [];

function fakeStorage(objects: Record<string, Obj>): StorageProvider {
  return {
    name: 'fake',
    presignPut: () => Promise.resolve(''),
    presignGet: () => Promise.resolve(''),
    head: (key) => {
      const o = objects[key];
      return Promise.resolve(o ? { size: o.size, contentType: o.contentType } : null);
    },
    readPrefix: (key, n) => {
      const o = objects[key];
      if (!o) return Promise.resolve(null);
      return Promise.resolve(
        (o.body ?? MAGIC[o.contentType ?? ''] ?? Buffer.alloc(0)).subarray(0, n),
      );
    },
    put: () => Promise.resolve(),
    delete: (key) => {
      deleted.push(key);
      return Promise.resolve();
    },
    publicUrl: (key) => `${BASE}${key}`,
  };
}

const svc = new ImageRefService(
  fakeStorage({
    'project-cover/u1/a.png': { size: 1000, contentType: 'image/png' },
    'project-cover/u1/big.png': { size: 6 * 1024 * 1024, contentType: 'image/png' },
    'project-cover/u1/doc.pdf': { size: 100, contentType: 'application/pdf' },
    'chat-file/u1/a.pdf': { size: 300 * 1024, contentType: 'application/pdf' },
    'chat-file/u1/x.svg': { size: 100, contentType: 'image/svg+xml' },
    'chat-file/u1/big.zip': { size: 21 * 1024 * 1024, contentType: 'application/zip' },
    'chat-image/u1/a.png': { size: 2048, contentType: 'image/png' },
    'chat-file/u1/mz.pdf': { size: 100, contentType: 'application/pdf', body: Buffer.from('MZ') },
    'chat-file/u1/fake.png': { size: 100, contentType: 'image/png', body: PDF },
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
    const cur = 'https://cdn.example/legacy.png';
    expect(await svc.resolve({ ...base, url: cur, current: cur })).toBe(cur);
  });

  it('REQ-226 TD-014 data URL (kể cả ảnh hợp lệ) → 400, gửi lại data URL đang lưu thì giữ', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(await message(svc.resolve({ ...base, url: png }))).toBe('Ảnh không hợp lệ');
    expect(await svc.resolve({ ...base, url: png, current: png })).toBe(png);
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

describe('ImageRefService.resolveFile (TIP-V2-111)', () => {
  const file = (url: string, bytes?: number) => ({
    userId: 'u1',
    kind: 'chat-file' as const,
    path: 'attachment',
    attachment: { name: 'bao-cao.pdf', size: '', ext: '', url, ...(bytes ? { bytes } : {}) },
  });

  it('BUG-010 QT-06 tệp của chính mình đã PUT → chuẩn hoá tên/đuôi/dung lượng', async () => {
    const a = await svc.resolveFile(file(`${BASE}chat-file/u1/a.pdf`, 300 * 1024));
    expect(a).toEqual({
      name: 'bao-cao.pdf',
      ext: 'PDF',
      size: '300 KB',
      bytes: 300 * 1024,
      contentType: 'application/pdf',
      url: `${BASE}chat-file/u1/a.pdf`,
    });
    const img = await svc.resolveFile({
      userId: 'u1',
      kind: 'chat-image',
      path: 'attachment',
      attachment: { name: 'anh.png', size: '', ext: '', url: `${BASE}chat-image/u1/a.png` },
    });
    expect(img).toMatchObject({ ext: 'IMG', size: '2 KB', contentType: 'image/png' });
  });

  it('BUG-010 tệp người khác / sai kind / chưa PUT / svg / quá 20MB / lệch bytes → 400', async () => {
    expect(await message(svc.resolveFile(file(`${BASE}chat-file/u2/a.pdf`)))).toBe(
      'Tệp không hợp lệ',
    );
    expect(await message(svc.resolveFile(file(`${BASE}avatar/u1/a.pdf`)))).toBe('Tệp không hợp lệ');
    expect(await message(svc.resolveFile(file('https://evil.example/a.pdf')))).toBe(
      'Tệp không hợp lệ',
    );
    expect(await message(svc.resolveFile(file(`${BASE}chat-file/u1/none.pdf`)))).toBe(
      'Tệp chưa được tải lên',
    );
    expect(await message(svc.resolveFile(file(`${BASE}chat-file/u1/x.svg`)))).toMatch(/20 MB/);
    expect(await message(svc.resolveFile(file(`${BASE}chat-file/u1/big.zip`)))).toMatch(/20 MB/);
    expect(await message(svc.resolveFile(file(`${BASE}chat-file/u1/a.pdf`, 5)))).toBe(
      'Tệp không hợp lệ',
    );
  });
});

describe('ImageRefService.resolveFile — D-117 B5 chặn tệp thực thi', () => {
  const file = (url: string, name: string) => ({
    userId: 'u1',
    kind: 'chat-file' as const,
    path: 'attachment',
    attachment: { name, size: '', ext: '', url },
  });
  const code = async (p: Promise<unknown>) => {
    try {
      await p;
      return 'ok';
    } catch (e) {
      return e instanceof AppError ? `${e.code}:${String(e.status)}` : 'other';
    }
  };

  it('đuôi thực thi (kể cả đuôi kép) → 422 FILE_REJECTED, object bị xoá', async () => {
    deleted.length = 0;
    expect(await code(svc.resolveFile(file(`${BASE}chat-file/u1/a.pdf`, 'x.exe')))).toBe(
      'FILE_REJECTED:422',
    );
    expect(await code(svc.resolveFile(file(`${BASE}chat-file/u1/a.pdf`, 'hoa-don.pdf.exe')))).toBe(
      'FILE_REJECTED:422',
    );
    expect(deleted).toEqual(['chat-file/u1/a.pdf', 'chat-file/u1/a.pdf']);
  });

  it('đuôi lệch MIME / byte đầu lệch kiểu (MZ khai PDF, PDF khai PNG) → 422', async () => {
    expect(await code(svc.resolveFile(file(`${BASE}chat-file/u1/a.pdf`, 'bang.xlsx')))).toBe(
      'FILE_REJECTED:422',
    );
    expect(await code(svc.resolveFile(file(`${BASE}chat-file/u1/mz.pdf`, 'bao-cao.pdf')))).toBe(
      'FILE_REJECTED:422',
    );
    expect(await code(svc.resolveFile(file(`${BASE}chat-file/u1/fake.png`, 'anh.png')))).toBe(
      'FILE_REJECTED:422',
    );
  });

  it('PDF thật, tên đúng đuôi → ok', async () => {
    expect(await code(svc.resolveFile(file(`${BASE}chat-file/u1/a.pdf`, 'bao-cao.pdf')))).toBe(
      'ok',
    );
  });
});
