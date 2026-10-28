import { Inject, Injectable } from '@nestjs/common';
import type { StorageProvider } from '@opchub/integrations';
import {
  type Attachment,
  CHAT_FILE_MAX_BYTES,
  cleanFileName,
  extMatchesMime,
  hasExecutableExt,
  MAGIC_PREFIX_BYTES,
  magicMatches,
  fileExtLabel,
  formatFileSize,
  IMAGE_MAX_BYTES as IMAGE_MAX,
  isChatFileMime,
  isImageMime,
  type UploadKind,
} from '@opchub/shared/api-domains';
import { AppError } from '@/common/errors';
import { STORAGE } from '@/common/integrations';

export const IMAGE_MAX_BYTES = IMAGE_MAX;

export interface ImageRefInput {
  userId: string;
  kind: UploadKind;
  url: string | null | undefined;
  /** Giá trị đang lưu — gửi lại y nguyên thì không kiểm lại */
  current?: string | null;
  /** Đường dẫn trường cho lỗi 400 */
  path: string;
}

export interface FileRefInput {
  userId: string;
  kind: 'chat-image' | 'chat-file';
  /** Đính kèm client gửi (name, url, bytes…) */
  attachment: Attachment;
  path: string;
}

export const FILE_INVALID = 'Tệp không hợp lệ';
export const FILE_MISSING = 'Tệp chưa được tải lên';
export const FILE_REJECTED = 'Tệp không an toàn hoặc không đúng định dạng';

/** Khoá object nếu URL thuộc storage (`base`) + đúng tiền tố `${kind}/${userId}/`; không thì null */
export function ownStorageKey(
  base: string,
  url: string,
  kind: UploadKind,
  userId: string,
): string | null {
  if (!url.startsWith(base)) return null;
  const key = url.slice(base.length);
  if (!key.startsWith(`${kind}/${userId}/`) || key.includes('..') || /[?#]/.test(key)) {
    return null;
  }
  return key;
}

/**
 * security.md › Upload: ảnh/tệp gắn vào bản ghi phải là object do chính người gọi tải lên qua
 * presign (khoá `${kind}/${userId}/…`), kiểm lại `head` (kích thước + MIME). Gọi NGOÀI transaction
 * (luật 9).
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
    const key = this.ownKey(url, i.kind, i.userId);
    if (!key) throw this.invalid(i.path, 'Ảnh không hợp lệ');
    const head = await this.storage.head(key);
    if (!head) throw this.invalid(i.path, 'Ảnh chưa được tải lên');
    if (head.size > IMAGE_MAX_BYTES || !isImageMime(head.contentType ?? '')) {
      throw this.invalid(i.path, 'Ảnh phải là PNG/JPEG/WEBP, tối đa 5MB');
    }
    return url;
  }

  /**
   * BUG-010 / QT-06: tệp/ảnh đính kèm chat — khoá của chính người gửi, đã PUT, `bytes` khớp
   * `head().size` (±0), MIME trong whitelist theo kind. Trả đính kèm chuẩn hoá để lưu jsonb.
   */
  async resolveFile(i: FileRefInput): Promise<Required<Attachment>> {
    const url = i.attachment.url?.trim() ?? '';
    const key = url ? this.ownKey(url, i.kind, i.userId) : null;
    if (!key) throw this.invalid(i.path, FILE_INVALID);
    const head = await this.storage.head(key);
    if (!head) throw this.invalid(i.path, FILE_MISSING);
    const type = head.contentType ?? '';
    const image = i.kind === 'chat-image';
    const okType = image ? isImageMime(type) : isChatFileMime(type);
    const max = image ? IMAGE_MAX_BYTES : CHAT_FILE_MAX_BYTES;
    if (!okType || head.size > max) {
      throw this.invalid(
        i.path,
        image ? 'Ảnh phải là PNG/JPEG/WEBP, tối đa 5MB' : 'Tệp không được hỗ trợ hoặc vượt 20 MB',
      );
    }
    if (i.attachment.bytes !== undefined && i.attachment.bytes !== head.size) {
      throw this.invalid(i.path, FILE_INVALID);
    }
    const name = cleanFileName(i.attachment.name);
    // D-117 B5: đuôi thực thi / đuôi lệch MIME / byte đầu lệch kiểu → xoá object, 422
    const prefix = await this.storage.readPrefix(key, MAGIC_PREFIX_BYTES);
    if (
      hasExecutableExt(name) ||
      !isChatFileMime(type) ||
      !extMatchesMime(name, type) ||
      !prefix ||
      !magicMatches(type, prefix)
    ) {
      await this.storage.delete(key);
      throw new AppError('FILE_REJECTED', FILE_REJECTED, [
        { path: i.path, message: FILE_REJECTED },
      ]);
    }
    return {
      name,
      ext: image ? 'IMG' : fileExtLabel(name, type),
      size: formatFileSize(head.size),
      bytes: head.size,
      contentType: type,
      url,
    };
  }

  private ownKey(url: string, kind: UploadKind, userId: string): string | null {
    return ownStorageKey(this.storage.publicUrl(''), url, kind, userId);
  }

  private invalid(path: string, message: string): AppError {
    return new AppError('VALIDATION_ERROR', message, [{ path, message }]);
  }
}
