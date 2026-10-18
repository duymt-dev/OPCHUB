import { PNG } from 'pngjs';

/**
 * Ảnh PNG thật sinh trong test (TIP-V2-102 — không thêm tệp nhị phân vào repo). Điểm ảnh nhiễu giả
 * ngẫu nhiên (seed cố định) để PNG khó nén → dung lượng ≈ `targetBytes`.
 */
export function noisePng(targetBytes: number, name = 'anh.png') {
  const side = Math.ceil(Math.sqrt(targetBytes / 3));
  const png = new PNG({ width: side, height: side });
  let seed = 12345;
  for (let i = 0; i < png.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      png.data[i + c] = (seed >>> 16) & 0xff;
    }
    png.data[i + 3] = 255;
  }
  return { name, mimeType: 'image/png', buffer: PNG.sync.write(png) };
}
