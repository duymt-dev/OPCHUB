'use client';

import { NotificationBell } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useNotifications } from '../hooks/use-notifications';

/** Chuông topbar Portal nối `GET /notifications` của người đang đăng nhập (D-29) */
export function PortalNotifications() {
  const t = useTranslations('shell.notifications');
  const tCommon = useTranslations('common.shell');
  const notifs = useNotifications();
  return (
    <NotificationBell
      items={notifs.items}
      unread={notifs.unread}
      labels={{
        button: tCommon('notifications'),
        title: t('title'),
        markAll: t('markAll'),
        tabAll: t('tabAll'),
        tabUnread: (n) => t('tabUnread', { n }),
        empty: t('empty'),
      }}
      onOpenItem={notifs.open}
      onMarkAll={notifs.markAll}
      onOpenChange={notifs.onOpenChange}
    />
  );
}
