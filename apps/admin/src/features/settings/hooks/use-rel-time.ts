'use client';

import { useTranslations } from 'next-intl';
import { relativeTime } from '../model';
import { useNumberText } from '@/i18n/use-number-text';

/** "vừa xong" / "10 phút trước" / "Hôm qua" / "3 ngày trước" (giờ hiện tại của trình duyệt) */
export function useRelTime() {
  const numberText = useNumberText();
  const t = useTranslations('settings.time');
  return (at: string) => {
    const r = relativeTime(at, Date.now());
    return r.k === 'now' || r.k === 'yesterday' ? t(r.k) : t(r.k, { n: numberText(r.n) });
  };
}
