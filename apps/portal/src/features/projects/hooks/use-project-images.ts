'use client';

import { useImageUpload, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useUploadErrorText } from '@/i18n/ui-labels';
import { uploadImage } from '@/lib/upload-image';

/** Chọn ảnh: tệp, giá trị đang có (giữ lại khi lỗi), ghi giá trị ô */
export type PickImage = (
  file: File,
  previous: string | null,
  apply: (url: string | null) => void,
) => void;

export interface ProjectImages {
  pickCover: PickImage;
  pickTeam: PickImage;
  /** Đang tải ảnh — khoá nút Lưu nháp / Gửi đăng */
  uploading: boolean;
}

/** NA-26 (TIP-V2-102): ảnh bìa + ảnh đội ngũ nén → presign → PUT storage; form chỉ giữ URL */
export function useProjectImages(): ProjectImages {
  const t = useTranslations('projects.form');
  const toast = useToast();
  const errorText = useUploadErrorText();
  const cover = useImageUpload((file) => uploadImage(file, 'project-cover'));
  const team = useImageUpload((file) => uploadImage(file, 'team-avatar'));
  const handlers = (previous: string | null, apply: (url: string | null) => void) => ({
    previous,
    apply,
    onInvalid: () => toast(t('coverTooLarge')),
    onError: (e: unknown) => toast(errorText(e, t('coverTooLarge'))),
  });
  return {
    pickCover: (file, previous, apply) => cover.pick(file, handlers(previous, apply)),
    pickTeam: (file, previous, apply) => team.pick(file, handlers(previous, apply)),
    uploading: cover.uploading || team.uploading,
  };
}
