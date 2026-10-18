'use client';

import {
  aseanFlags,
  authHeroImages,
  authStats,
  DEFAULT_ONLINE,
  quoteAt,
} from '@opchub/shared/fixtures';
import { AuthHero } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const ROTATE_MS = 7000;

/** Cột trái màn Auth: nội dung lấy từ fixtures, chữ qua i18n */
export function LoginHero() {
  const t = useTranslations('auth.hero');
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
      online={DEFAULT_ONLINE.toLocaleString('vi-VN')}
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
        newMembersCount: t('newMembersCount'),
        newMembersLabel: t('newMembersLabel'),
        stats: [
          { value: authStats.members, label: t('statMembers') },
          { value: authStats.communities, label: t('statCommunities') },
          { value: authStats.eventsPerYear, label: t('statEvents') },
        ],
        presentIn: t('presentIn'),
        copyright: t('copyright'),
      }}
    />
  );
}
