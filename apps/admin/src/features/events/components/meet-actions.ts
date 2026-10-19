'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';

/** Sao chép / mở link Meet — clipboard bị chặn (http, quyền) thì vẫn báo như prototype */
export function useMeetActions() {
  const toast = useToast();
  const t = useTranslations('events.toast');
  return {
    copy: async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // không có thao tác thay thế
      }
      toast(t('meetCopied'));
    },
    open: (url: string) => window.open(url, '_blank', 'noopener'),
  };
}
