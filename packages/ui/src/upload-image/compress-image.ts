/**
 * NA-26: ảnh JPG/PNG/WebP ≤ 5 MB, nén ở client trước khi presign (server không xử lý ảnh).
 * Canvas → WebP (không có thì JPEG) chất lượng 0,85, cạnh dài ≤ `maxEdge`, giữ tỉ lệ.
 */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Ảnh bìa (nhóm, sự kiện, dự án) */
export const COVER_MAX_EDGE = 1600;
/** Ảnh đại diện, logo, persona, ảnh đội ngũ */
export const AVATAR_MAX_EDGE = 512;

export type ImageProblem = 'type' | 'size';

export const isImageType = (t: string): t is ImageType =>
  (IMAGE_TYPES as readonly string[]).includes(t);

/** Sai định dạng / quá 5 MB → lý do (form báo lỗi tại ô, giữ ảnh cũ); hợp lệ → null */
export function validateImageFile(file: { type: string; size: number }): ImageProblem | null {
  if (!isImageType(file.type)) return 'type';
  if (file.size <= 0 || file.size > IMAGE_MAX_BYTES) return 'size';
  return null;
}

/** Kích thước mới: cạnh dài ≤ maxEdge, giữ tỉ lệ, không phóng to, tối thiểu 1px */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width, height };
  const k = maxEdge / long;
  return {
    width: Math.max(1, Math.round(width * k)),
    height: Math.max(1, Math.round(height * k)),
  };
}

export interface CompressOptions {
  maxEdge: number;
  quality?: number;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Nén ảnh; trình duyệt không giải mã/vẽ được (hoặc bản nén không nhỏ hơn) → trả tệp gốc
 * (đã qua `validateImageFile`). Kết quả luôn là JPG/PNG/WebP.
 */
export async function compressImage(file: File, opts: CompressOptions): Promise<File> {
  const quality = opts.quality ?? 0.85;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const size = fitWithin(bitmap.width, bitmap.height, opts.maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    let blob = await toBlob(canvas, 'image/webp', quality);
    // Trình duyệt không mã hoá WebP trả PNG → dùng JPEG
    if (blob?.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
    if (!blob || !isImageType(blob.type)) return file;
    const resized = size.width !== bitmap.width || size.height !== bitmap.height;
    if (!resized && blob.size >= file.size) return file;
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const name = file.name.replace(/\.[^.]*$/, '') || 'image';
    return new File([blob], `${name}.${ext}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}
