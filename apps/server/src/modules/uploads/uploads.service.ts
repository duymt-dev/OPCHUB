import { Inject, Injectable } from '@nestjs/common';
import type { StorageProvider } from '@opchub/integrations';
import type { PresignRequest, PresignResult } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { STORAGE } from '@/common/integrations';

const EXT: Record<PresignRequest['contentType'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
/** PUT có chữ ký sống 5 phút */
const PUT_TTL_SEC = 300;

/**
 * Presigned PUT (security.md › Upload): API không nhận file. Khoá có tiền tố user để
 * domain dùng ảnh (PATCH /me avatarUrl) kiểm được ảnh thuộc người gửi.
 */
@Injectable()
export class UploadsService {
  constructor(@Inject(STORAGE) private readonly storage: StorageProvider) {}

  async presign(userId: string, req: PresignRequest): Promise<PresignResult> {
    const key = `${req.kind}/${userId}/${randomUUID()}.${EXT[req.contentType]}`;
    const uploadUrl = await this.storage.presignPut(key, req.contentType, req.size, PUT_TTL_SEC);
    return { uploadUrl, publicUrl: this.storage.publicUrl(key) };
  }
}
