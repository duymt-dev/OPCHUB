'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { ImageUploadKind } from '@opchub/shared/api-domains';
import { uploadImage } from '@/lib/upload-image';
import { LocalImageUploadError } from '@/lib/image-upload-error';

/** Shared Portal uploader stays untouched. Only typed local failures are translated. */
export function useUploadImage() {
  const t = useTranslations('ui');
  const latest = useRef(t);
  useEffect(() => {
    latest.current = t;
  }, [t]);

  return async (file: File, kind: ImageUploadKind) => {
    try {
      return await uploadImage(file, kind);
    } catch (error) {
      if (error instanceof LocalImageUploadError)
        throw new Error(latest.current(`errors.${error.code}`), { cause: error });
      throw error;
    }
  };
}
