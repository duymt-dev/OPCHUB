'use client';

import { aseanFlags, authHeroImages, quoteAt } from '@opchub/shared/fixtures';
import { AuthHero } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePublicStats } from '../hooks/use-public-stats';

const ROTATE_MS = 7000;
/** Chưa có số (SSR / đang tải) — không hiện số giả (BUG-029) */
const NONE = '—';
const fmt = (n: number | undefined) => (n === undefined ? NONE : n.toLocaleString('vi-VN'));

/** Cột trái màn Auth: ảnh/trích dẫn từ fixtures, số liệu thật từ `GET /public/stats` (CR-15) */
export function LoginHero() {
  const t = useTranslations('auth.hero');
  const stats = usePublicStats();
  // BUG-040 / TD-036: SSR và lần render đầu cùng `now = 0` (trích dẫn đầu tiên) để không lệch
  // hydration (#418) khi đồng hồ máy khách khác server; giờ thật chỉ đọc sau khi mount.
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, ROTATE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return (
    <AuthHero
      logoSrc="/opchub-logo.png"
      online={fmt(stats?.online)}
      quote={quoteAt(now)}
      images={authHeroImages}
      flags={aseanFlags}
      copy={{
        logoAlt: t('logoAlt'),
        onlineSuffix: t('onlineSuffix'),
        eyebrow: t('eyebrow'),
        headlineLead: t('headlineLead'),
        headlineAccent: t('headlineAccent'),
        sub: t('sub'),
        newMembersCount: stats ? `+${fmt(stats.newThisMonth)}` : NONE,
        newMembersLabel: t('newMembersLabel'),
        stats: [
          { value: fmt(stats?.members), label: t('statMembers') },
          { value: fmt(stats?.communities), label: t('statCommunities') },
          { value: fmt(stats?.eventsPerYear), label: t('statEvents') },
        ],
        presentIn: t('presentIn'),
        copyright: t('copyright'),
      }}
    />
  );
}
