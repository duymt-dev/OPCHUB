import { Inject, Injectable } from '@nestjs/common';
import type { StorageProvider } from '@opchub/integrations';
import {
  cleanFileName,
  extMatchesMime,
  fileExtLabel,
  formatFileSize,
  hasExecutableExt,
  isStoreDocMime,
  isVideoMime,
  MAGIC_PREFIX_BYTES,
  magicMatches,
  STORE_DOC_MAX_BYTES,
  STORE_VIDEO_MAX_BYTES,
  type UploadMime,
} from '@opchub/shared/api-domains';
import { AppError } from '@/common/errors';
import { STORAGE } from '@/common/integrations';
import { FILE_INVALID, FILE_MISSING, FILE_REJECTED, ownStorageKey } from './image-ref.service';

export interface StoreFileInput {
  userId: string;
  kind: 'store-video' | 'store-doc';
  url: string;
  /** Tên tệp người dùng (tài liệu) — kiểm đuôi thực thi / đuôi khớp MIME */
  name: string;
  path: string;
}

export interface StoreFileRef {
  url: string;
  name: string;
  ext: string;
  size: string;
}

const RULES = {
  'store-video': {
    ok: isVideoMime,
    max: STORE_VIDEO_MAX_BYTES,
    msg: 'Video phải là MP4 / WebM / MOV, tối đa 100 MB',
  },
  'store-doc': {
    ok: isStoreDocMime,
    max: STORE_DOC_MAX_BYTES,
    msg: 'Tài liệu phải là PDF / PPT / DOC, tối đa 20 MB',
  },
} as const;

/**
 * TIP-V42-710 (D-114 S5): video Reels + hồ sơ năng lực của gian hàng — object của chính chủ (presign
 * `${kind}/${userId}/…`), đã PUT, MIME + cỡ theo kind, chữ ký byte đầu khớp MIME, không đuôi thực thi
 * (D-117 B5; sai → xoá object, 422). Gọi NGOÀI transaction.
 */
@Injectable()
export class StoreFileRefService {
  constructor(@Inject(STORAGE) private readonly storage: StorageProvider) {}

  async resolve(i: StoreFileInput): Promise<StoreFileRef> {
    const url = i.url.trim();
    const key = ownStorageKey(this.storage.publicUrl(''), url, i.kind, i.userId);
    if (!key) throw invalid(i.path, FILE_INVALID);
    const head = await this.storage.head(key);
    if (!head) throw invalid(i.path, FILE_MISSING);
    const type = head.contentType ?? '';
    const rule = RULES[i.kind];
    if (!rule.ok(type) || head.size > rule.max) throw invalid(i.path, rule.msg);
    const name = cleanFileName(i.name);
    const prefix = await this.storage.readPrefix(key, MAGIC_PREFIX_BYTES);
    const mime = type as UploadMime;
    if (
      hasExecutableExt(name) ||
      !extMatchesMime(name, mime) ||
      !prefix ||
      !magicMatches(mime, prefix)
    ) {
      await this.storage.delete(key);
      throw new AppError('FILE_REJECTED', FILE_REJECTED, [
        { path: i.path, message: FILE_REJECTED },
      ]);
    }
    return { url, name, ext: fileExtLabel(name, type), size: formatFileSize(head.size) };
  }
}

const invalid = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);
