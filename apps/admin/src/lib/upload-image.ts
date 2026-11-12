import {
  type ImageUploadKind,
  type PresignRequest,
  presignResultSchema,
} from '@opchub/shared/api-domains';
import { AVATAR_MAX_EDGE, COVER_MAX_EDGE, compressImage, isImageType } from '@opchub/ui';
import { api } from './api-client';
import { LocalImageUploadError } from './image-upload-error';

/** Ảnh bìa nén cạnh 1600px; ảnh đại diện / logo / persona / đội ngũ 512px (NA-26) */
const COVER_KINDS: readonly ImageUploadKind[] = ['group-cover', 'event-cover', 'project-cover'];

/**
 * NA-26 (TIP-V2-102): nén ở client → `POST /uploads/presign` → PUT thẳng storage → URL công khai.
 * API không nhận file; server kiểm lại `head()` khi gắn URL vào bản ghi.
 */
export async function uploadImage(file: File, kind: ImageUploadKind): Promise<string> {
  const maxEdge = COVER_KINDS.includes(kind) ? COVER_MAX_EDGE : AVATAR_MAX_EDGE;
  const img = await compressImage(file, { maxEdge }).catch((cause: unknown) => {
    throw new LocalImageUploadError('imageUpload', { cause });
  });
  if (!isImageType(img.type)) throw new LocalImageUploadError('imageType');
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
  }).catch((cause: unknown) => {
    throw new LocalImageUploadError('imageUpload', { cause });
  });
  if (!res.ok) throw new LocalImageUploadError('imageUpload');
  return publicUrl;
}
