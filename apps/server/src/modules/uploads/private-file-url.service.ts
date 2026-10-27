import { Inject, Injectable } from '@nestjs/common';
import type { StorageProvider } from '@opchub/integrations';
import { STORAGE } from '@/common/integrations';
import { storageKeyOf } from './media-gc.service';

/** Tệp riêng (chat): link tải sống 5 phút (security.md › Tải file, V-15) */
export const PRIVATE_GET_TTL_SEC = 300;

/** Tiền tố khoá object không có URL công khai — tải qua URL ký sau khi kiểm quyền (D-98, D-117 B6) */
export const PRIVATE_PREFIXES = ['chat-file/', 'chat-image/'] as const;

export const isPrivateKey = (key: string) => PRIVATE_PREFIXES.some((p) => key.startsWith(p));

/**
 * D-117 B6: đính kèm chat lưu URL "công khai" (khoá object) trong jsonb; khi trả cho người đã qua kiểm
 * quyền (thành viên nhóm / Admin), đổi sang `presignGet` hạn ngắn. Khoá ngoài storage giữ nguyên.
 */
@Injectable()
export class PrivateFileUrlService {
  constructor(@Inject(STORAGE) private readonly storage: StorageProvider) {}

  async sign(url: string | null | undefined, downloadName?: string): Promise<string | null> {
    if (!url) return null;
    const key = storageKeyOf(url, this.storage.publicUrl(''));
    if (!key || !isPrivateKey(key)) return url;
    return this.storage.presignGet(key, PRIVATE_GET_TTL_SEC, downloadName);
  }

  /** Ký URL đính kèm cho cả danh sách (mỗi tệp một chữ ký, không truy vấn DB) */
  async signAll<T extends { attachment?: { url?: string | undefined; name: string } | null }>(
    items: readonly T[],
  ): Promise<T[]> {
    return Promise.all(
      items.map(async (m) => {
        const a = m.attachment;
        if (!a?.url) return m;
        const url = await this.sign(a.url, a.name);
        return { ...m, attachment: { ...a, url: url ?? undefined } };
      }),
    );
  }
}
