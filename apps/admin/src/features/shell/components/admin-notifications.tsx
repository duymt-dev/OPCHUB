'use client';

import { NotificationBell } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useNotifications } from '../hooks/use-notifications';
import { useNumberText } from '@/i18n/use-number-text';

/** Chuông topbar Admin nối `GET /notifications` của TK quản trị (D-04) */
export function AdminNotifications() {
  const numberText = useNumberText();
  const t = useTranslations('common');
  const notifs = useNotifications();
  return (
    <NotificationBell
      items={notifs.items}
      unread={notifs.unread}
      labels={{
        button: t('shell.notifications'),
        title: t('notifications.title'),
        markAll: t('notifications.markAll'),
        tabAll: t('notifications.tabAll'),
        tabUnread: (n) => t('notifications.tabUnread', { n: numberText(n) }),
        empty: t('notifications.empty'),
      }}
      onOpenItem={notifs.open}
      onMarkAll={notifs.markAll}
    />
  );
}
