'use client';

import type { ImageUploadKind } from '@opchub/shared/api-domains';
import { useToast, validateImageFile } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { messageOf } from '@/lib/api-errors';
import { UploadFileError, uploadStoreFile } from '@/lib/upload-file';
import { UploadImageError, uploadImage } from '@/lib/upload-image';

export type PickFile = (file: File, apply: (url: string) => void) => void;

/**
 * D-97 / D-114 S5: tải media gian hàng — ảnh nén → presign → PUT (`store-logo`, `store-cover`,
 * `store-gallery`, `store-team`, `store-cert`); video ≤ 100 MB, tài liệu ≤ 20 MB đi thẳng presign.
 * `apply` nhận URL công khai sau khi PUT xong; `uploading` khoá nút lưu khi còn tệp đang tải.
 */
export function useStoreMedia() {
  const t = useTranslations('stores.wizard.fileError');
  const toast = useToast();
  const [busy, setBusy] = useState(0);

  const fail = (e: unknown) => {
    if (e instanceof UploadImageError || e instanceof UploadFileError) toast(t(e.code));
    else toast(messageOf(e, t('failed')));
  };
  const run = (task: () => Promise<string>, apply: (url: string) => void) => {
    setBusy((n) => n + 1);
    task()
      .then(apply)
      .catch(fail)
      .finally(() => setBusy((n) => n - 1));
  };

  const image =
    (kind: ImageUploadKind): PickFile =>
    (file, apply) => {
      if (validateImageFile(file)) return toast(t('image'));
      run(() => uploadImage(file, kind), apply);
    };
  const file =
    (kind: 'store-video' | 'store-doc'): PickFile =>
    (f, apply) =>
      run(() => uploadStoreFile(f, kind), apply);

  return {
    uploading: busy > 0,
    logo: image('store-logo'),
    cover: image('store-cover'),
    gallery: image('store-gallery'),
    team: image('store-team'),
    cert: image('store-cert'),
    video: file('store-video'),
    doc: file('store-doc'),
  };
}
export type StoreMedia = ReturnType<typeof useStoreMedia>;
