import {
  type PresignRequest,
  presignResultSchema,
  type UploadKind,
} from '@opchub/shared/api-domains';
import { AVATAR_MAX_EDGE, COVER_MAX_EDGE, compressImage, isImageType } from '@opchub/ui';
import { api } from './api-client';

/** Ảnh bìa nén cạnh 1600px; ảnh đại diện / logo / persona / đội ngũ 512px (NA-26) */
const COVER_KINDS: readonly UploadKind[] = ['group-cover', 'event-cover', 'project-cover'];

/** D-65: lỗi tải ảnh mang mã, màn hình dịch qua `common.upload.<code>` */
export class UploadImageError extends Error {
  constructor(readonly code: 'type' | 'failed') {
    super(code);
    this.name = 'UploadImageError';
  }
}

/**
 * NA-26 (TIP-V2-102): nén ở client → `POST /uploads/presign` → PUT thẳng storage → URL công khai.
 * API không nhận file; server kiểm lại `head()` khi gắn URL vào bản ghi.
 */
export async function uploadImage(
  file: File,
  kind: Exclude<UploadKind, 'chat-file'>,
): Promise<string> {
  const maxEdge = COVER_KINDS.includes(kind) ? COVER_MAX_EDGE : AVATAR_MAX_EDGE;
  const img = await compressImage(file, { maxEdge });
  if (!isImageType(img.type)) throw new UploadImageError('type');
  const req: PresignRequest = { kind, contentType: img.type, size: img.size };
  const { uploadUrl, publicUrl } = await api('/uploads/presign', {
    method: 'POST',
    body: req,
    schema: presignResultSchema,
  });
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: img,
    headers: { 'Content-Type': img.type },
  });
  if (!res.ok) throw new UploadImageError('failed');
  return publicUrl;
}
