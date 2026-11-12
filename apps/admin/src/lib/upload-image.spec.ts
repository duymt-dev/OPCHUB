import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage } from '@opchub/ui';
import { api, ApiError } from './api-client';
import type * as ApiClient from './api-client';
import { uploadImage } from './upload-image';
import { LocalImageUploadError } from './image-upload-error';

vi.mock('@opchub/ui', () => ({
  AVATAR_MAX_EDGE: 512,
  COVER_MAX_EDGE: 1600,
  compressImage: vi.fn(),
  isImageType: (type: string) => ['image/png', 'image/jpeg', 'image/webp'].includes(type),
}));
vi.mock('./api-client', async (original) => ({
  ...(await original<typeof ApiClient>()),
  api: vi.fn(),
}));
const file = new File(['test'], 'avatar.png', { type: 'image/png' });
const put = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(compressImage).mockResolvedValue(file);
  vi.mocked(api).mockResolvedValue({
    uploadUrl: 'https://storage.test/put',
    publicUrl: '/uploads/a.png',
  });
  put.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', put);
});
afterEach(() => vi.unstubAllGlobals());

describe('D-141 AC824-10/11/12 local image identity and unchanged upload contract', () => {
  it.each([
    ['avatar', 512],
    ['persona-avatar', 512],
    ['platform-logo', 512],
    ['event-cover', 1600],
    ['group-cover', 1600],
    ['project-cover', 1600],
  ] as const)(
    '%s retains compression edge %s, presign values and storage PUT',
    async (kind, maxEdge) => {
      expect(await uploadImage(file, kind)).toBe('/uploads/a.png');
      expect(compressImage).toHaveBeenCalledWith(file, { maxEdge });
      expect(api).toHaveBeenCalledWith(
        '/uploads/presign',
        expect.objectContaining({
          method: 'POST',
          body: { kind, contentType: file.type, size: file.size },
        }),
      );
      expect(put).toHaveBeenCalledWith('https://storage.test/put', {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'image/png' },
      });
    },
  );
  it('invalid compressed MIME is a local type error and never requests presign', async () => {
    vi.mocked(compressImage).mockResolvedValue(
      new File(['bad'], 'bad.svg', { type: 'image/svg+xml' }),
    );
    await expect(uploadImage(file, 'avatar')).rejects.toMatchObject({ code: 'imageType' });
    expect(api).not.toHaveBeenCalled();
  });
  it('compression exceptions retain their cause but become typed local failures', async () => {
    const cause = new Error('browser canvas failed');
    vi.mocked(compressImage).mockRejectedValue(cause);
    await expect(uploadImage(file, 'avatar')).rejects.toMatchObject({ code: 'imageUpload', cause });
    expect(api).not.toHaveBeenCalled();
  });
  it.each(['http', 'network'])('storage %s errors are local, not API messages', async (kind) => {
    if (kind === 'http') put.mockResolvedValue(new Response(null, { status: 500 }));
    else put.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(uploadImage(file, 'avatar')).rejects.toBeInstanceOf(LocalImageUploadError);
  });
  it('presign API text/fields/identity pass through unchanged, even when matching a local message', async () => {
    const raw = new ApiError('VALIDATION_ERROR', 400, 'Ảnh phải là PNG/JPEG/WEBP', [
      { path: 'kind', message: 'raw backend field' },
    ]);
    vi.mocked(api).mockRejectedValue(raw);
    await expect(uploadImage(file, 'avatar')).rejects.toBe(raw);
    expect(put).not.toHaveBeenCalled();
  });
});
