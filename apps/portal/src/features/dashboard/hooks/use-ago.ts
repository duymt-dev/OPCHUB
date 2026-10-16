'use client';

import { useTranslations } from 'next-intl';
import { liveAgo, longAgo } from '../model';

/** Định dạng "x giây/phút trước" (khối LIVE) và "x phút/giờ/ngày trước" (thảo luận) */
export function useAgo(now: number) {
  const t = useTranslations('dashboard.ago');
  return {
    live: (at: string) => {
      const a = liveAgo(at, now);
      return t(a.key, { n: a.n });
    },
    long: (at: string) => {
      const a = longAgo(at, now);
      return t(a.key, { n: a.n });
    },
  };
}
