import {
  isStoreDocMime,
  isVideoMime,
  presignResultSchema,
  STORE_DOC_MAX_BYTES,
  STORE_VIDEO_MAX_BYTES,
} from '@opchub/shared/api-domains';
import { api } from './api-client';

/** Lỗi chọn tệp mang mã — màn hình dịch qua `stores.wizard.fileError.<code>` */
export class UploadFileError extends Error {
  constructor(readonly code: 'type' | 'size' | 'failed') {
    super(code);
    this.name = 'UploadFileError';
  }
}

/** Trình duyệt hay để trống MIME của .ppt / .doc → suy theo đuôi (server kiểm lại chữ ký byte đầu) */
const DOC_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const RULES = {
  'store-video': { ok: isVideoMime, max: STORE_VIDEO_MAX_BYTES },
  'store-doc': { ok: isStoreDocMime, max: STORE_DOC_MAX_BYTES },
} as const;

/**
 * D-114 S5 (TIP-V42-710): video Reels ≤ 100 MB / hồ sơ năng lực PDF · PPT · DOC ≤ 20 MB của gian hàng —
 * presign → PUT thẳng storage → URL công khai (API không nhận file; server kiểm `head` + chữ ký khi lưu).
 */
export async function uploadStoreFile(
  file: File,
  kind: 'store-video' | 'store-doc',
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const type = file.type || (kind === 'store-doc' ? (DOC_BY_EXT[ext] ?? '') : '');
  const rule = RULES[kind];
  if (!rule.ok(type)) throw new UploadFileError('type');
  if (file.size <= 0 || file.size > rule.max) throw new UploadFileError('size');
  const { uploadUrl, publicUrl } = await api('/uploads/presign', {
    method: 'POST',
    body: { kind, contentType: type, size: file.size },
    schema: presignResultSchema,
  });
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': type },
  });
  if (!res.ok) throw new UploadFileError('failed');
  return publicUrl;
}
