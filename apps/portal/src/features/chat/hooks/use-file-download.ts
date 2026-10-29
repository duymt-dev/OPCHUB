'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { messageOf } from '@/lib/api-errors';
import { fetchAttachmentLink } from '../api';

/**
 * D-117 B6: tệp chat không có URL công khai — bấm "Tải về" thì xin link ký mới của tin rồi mở.
 * `href` vẫn giữ link ký sẵn (còn hạn 5 phút) để chuột phải / mở tab mới không gãy.
 */
export function useFileDownload() {
  const t = useTranslations('chat.messages');
  const toast = useToast();
  return async (e: MouseEvent<HTMLAnchorElement>, messageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const url = await fetchAttachmentLink(messageId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast(messageOf(err, t('downloadFailed')));
    }
  };
}
