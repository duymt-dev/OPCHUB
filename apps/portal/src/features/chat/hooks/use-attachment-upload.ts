'use client';

import {
  CHAT_FILE_MAX_BYTES,
  IMAGE_MAX_BYTES,
  isChatFileMime,
  isImageMime,
  type SendMessageRequest,
} from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { messageOf } from '@/lib/api-errors';
import { presignUpload } from '../api';

export type AttachKind = 'file' | 'image';
type Attachment = NonNullable<SendMessageRequest['attachment']>;

/** `accept` của hộp chọn tệp theo whitelist (BR-1 TIP-V2-111) */
export const ACCEPT: Record<AttachKind, string> = {
  image: 'image/png,image/jpeg,image/webp',
  file: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.txt,.png,.jpg,.jpeg,.webp',
};

/** Kiểm MIME + cỡ ở FE trước khi presign (NA-26); hợp lệ → null, sai → khoá lỗi i18n */
export function checkFile(kind: AttachKind, f: { type: string; size: number }) {
  if (kind === 'image')
    return isImageMime(f.type) && f.size > 0 && f.size <= IMAGE_MAX_BYTES ? null : 'imageInvalid';
  if (!isChatFileMime(f.type)) return 'fileType';
  return f.size > 0 && f.size <= CHAT_FILE_MAX_BYTES ? null : 'fileTooBig';
}

/**
 * BUG-010 / QT-06: chọn tệp thật → kiểm → presign → PUT storage → trả đính kèm có `url` để gửi
 * tin `file|image`. Lỗi (kiểm / presign / PUT) → toast, không gửi tin.
 */
export function useAttachmentUpload(onReady: (kind: AttachKind, a: Attachment) => void) {
  const t = useTranslations('chat.composer');
  const toast = useToast();
  const [busy, setBusy] = useState<AttachKind | null>(null);

  const upload = async (kind: AttachKind, file: File) => {
    const bad = checkFile(kind, file);
    // Ảnh là tập con của whitelist chat-file → kiểm thêm để có kiểu MIME hẹp
    if (bad || !isChatFileMime(file.type)) {
      toast(t(bad ?? 'fileType'));
      return;
    }
    const type = file.type;
    setBusy(kind);
    try {
      const url = await presignUpload(file, kind === 'image' ? 'chat-image' : 'chat-file', type);
      onReady(kind, {
        name: file.name,
        size: '',
        ext: '',
        url,
        bytes: file.size,
        contentType: type,
      });
    } catch (e) {
      toast(messageOf(e, t('uploadFailed')));
    } finally {
      setBusy(null);
    }
  };

  return { busy, upload: (kind: AttachKind, file: File) => void upload(kind, file) };
}
