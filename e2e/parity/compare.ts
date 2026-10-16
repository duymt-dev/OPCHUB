import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface CompareResult {
  diffPct: number;
  width: number;
  height: number;
  diff: Buffer;
}

/** Đệm ảnh lên kích thước lớn hơn bằng màu hồng — vùng đệm luôn tính là khác */
function pad(img: PNG, width: number, height: number): PNG {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 0xff;
    out.data[i + 1] = 0x00;
    out.data[i + 2] = 0xff;
    out.data[i + 3] = 0xff;
  }
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

/** pixelmatch threshold 0.1; % = pixel khác / tổng pixel */
export function compare(a: Buffer, b: Buffer): CompareResult {
  const pa = PNG.sync.read(a);
  const pb = PNG.sync.read(b);
  const width = Math.max(pa.width, pb.width);
  const height = Math.max(pa.height, pb.height);
  const A = pad(pa, width, height);
  const B = pad(pb, width, height);
  const out = new PNG({ width, height });
  const n = pixelmatch(A.data, B.data, out.data, width, height, { threshold: 0.1 });
  return { diffPct: (n / (width * height)) * 100, width, height, diff: PNG.sync.write(out) };
}
