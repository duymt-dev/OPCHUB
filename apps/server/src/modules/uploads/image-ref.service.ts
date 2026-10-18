import { Inject, Injectable } from '@nestjs/common';
import type { StorageProvider } from '@opchub/integrations';
import type { UploadKind } from '@opchub/shared/api-domains';
import { AppError } from '@/common/errors';
import { STORAGE } from '@/common/integrations';

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface ImageRefInput {
  userId: string;
  kind: UploadKind;
  url: string | null | undefined;
  /** Giá trị đang lưu — gửi lại y nguyên thì không kiểm lại */
  current?: string | null;
  /** Đường dẫn trường cho lỗi 400 */
  path: string;
}

/**
 * security.md › Upload: ảnh gắn vào bản ghi phải là object do chính người gọi tải lên qua presign
 * (khoá `${kind}/${userId}/…`), kiểm lại `head` (kích thước + MIME). Gọi NGOÀI transaction (luật 9).
 */
@Injectable()
export class ImageRefService {
  constructor(@Inject(STORAGE) private readonly storage: StorageProvider) {}

  async resolve(i: ImageRefInput): Promise<string | null> {
    const url = i.url?.trim() ?? '';
    if (!url) return null;
    if (i.current && url === i.current) return url;
    // NA-26 / TD-014: không nhận data URL — ảnh đi qua presign + PUT storage
    if (url.startsWith('data:')) throw this.invalid(i.path, 'Ảnh không hợp lệ');
    const base = this.storage.publicUrl('');
    if (!url.startsWith(base)) throw this.invalid(i.path, 'Ảnh không hợp lệ');
    const key = url.slice(base.length);
    if (!key.startsWith(`${i.kind}/${i.userId}/`) || key.includes('..')) {
      throw this.invalid(i.path, 'Ảnh không hợp lệ');
    }
    const head = await this.storage.head(key);
    if (!head) throw this.invalid(i.path, 'Ảnh chưa được tải lên');
    if (head.size > IMAGE_MAX_BYTES || !IMAGE_MIME.has(head.contentType ?? '')) {
      throw this.invalid(i.path, 'Ảnh phải là PNG/JPEG/WEBP, tối đa 5MB');
    }
    return url;
  }

  private invalid(path: string, message: string): AppError {
    return new AppError('VALIDATION_ERROR', message, [{ path, message }]);
  }
}
