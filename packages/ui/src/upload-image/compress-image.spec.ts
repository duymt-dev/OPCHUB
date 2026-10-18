import { describe, expect, it } from 'vitest';
import {
  AVATAR_MAX_EDGE,
  COVER_MAX_EDGE,
  compressImage,
  fitWithin,
  IMAGE_MAX_BYTES,
  validateImageFile,
} from './compress-image';

describe('compressImage (NA-26, TIP-V2-102)', () => {
  it('REQ-226 giới hạn cạnh dài, giữ tỉ lệ, không phóng to', () => {
    expect(fitWithin(4000, 3000, COVER_MAX_EDGE)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3000, COVER_MAX_EDGE)).toEqual({ width: 533, height: 1600 });
    expect(fitWithin(2048, 2048, AVATAR_MAX_EDGE)).toEqual({ width: 512, height: 512 });
    expect(fitWithin(300, 200, AVATAR_MAX_EDGE)).toEqual({ width: 300, height: 200 });
    // Ảnh rất dẹt vẫn ≥ 1px
    expect(fitWithin(100_000, 10, AVATAR_MAX_EDGE)).toEqual({ width: 512, height: 1 });
    const r = fitWithin(3001, 1999, COVER_MAX_EDGE);
    expect(Math.abs(r.width / r.height - 3001 / 1999)).toBeLessThan(0.01);
  });

  it('REQ-226 GIF hoặc > 5 MB → lỗi; PNG/JPG/WebP ≤ 5 MB → hợp lệ', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1000 })).toBe('type');
    expect(validateImageFile({ type: 'image/svg+xml', size: 1000 })).toBe('type');
    expect(validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024 })).toBe('size');
    expect(validateImageFile({ type: 'image/png', size: 0 })).toBe('size');
    expect(validateImageFile({ type: 'image/png', size: IMAGE_MAX_BYTES })).toBeNull();
    expect(validateImageFile({ type: 'image/jpeg', size: 300 * 1024 })).toBeNull();
    expect(validateImageFile({ type: 'image/webp', size: 1 })).toBeNull();
  });

  it('REQ-226 trình duyệt không giải mã được (jsdom) → trả tệp gốc', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'a.png', {
      type: 'image/png',
    });
    expect(await compressImage(file, { maxEdge: COVER_MAX_EDGE })).toBe(file);
  });
});
