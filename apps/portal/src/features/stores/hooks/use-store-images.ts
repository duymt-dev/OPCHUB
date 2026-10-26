'use client';

import { useImageUpload, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useUploadErrorText } from '@/i18n/ui-labels';
import { uploadImage } from '@/lib/upload-image';

export type PickImage = (
  file: File,
  previous: string | null,
  apply: (url: string | null) => void,
) => void;

/** NA-26: ảnh bìa (`store-cover`) + ảnh sản phẩm (`store-item`) nén → presign → PUT storage */
export function useStoreImages() {
  const t = useTranslations('stores.mine');
  const toast = useToast();
  const errorText = useUploadErrorText();
  const cover = useImageUpload((file) => uploadImage(file, 'store-cover'));
  const item = useImageUpload((file) => uploadImage(file, 'store-item'));
  const handlers = (previous: string | null, apply: (url: string | null) => void) => ({
    previous,
    apply,
    onInvalid: () => toast(t('coverTooLarge')),
    onError: (e: unknown) => toast(errorText(e, t('coverTooLarge'))),
  });
  const pickCover: PickImage = (file, previous, apply) =>
    cover.pick(file, handlers(previous, apply));
  const pickItem: PickImage = (file, previous, apply) => item.pick(file, handlers(previous, apply));
  return { pickCover, pickItem, uploading: cover.uploading || item.uploading };
}
