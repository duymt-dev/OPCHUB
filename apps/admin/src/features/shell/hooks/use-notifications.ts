'use client';

import type { NotificationList } from '@opchub/shared/api-domains';
import type { NotificationView } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchNotifications, markRead, shellKeys } from '../api';
import { noticeAgo } from '../model';

/**
 * Thông báo của TK quản trị (D-04, D-29). Deep-link của thông báo trỏ về Portal nên ở Admin
 * mở thông báo chỉ đánh dấu đã đọc (prototype cũng không đổi màn).
 */
export function useNotifications() {
  const t = useTranslations('common.ago');
  const qc = useQueryClient();
  const q = useQuery({ queryKey: shellKeys.notifications, queryFn: fetchNotifications });

  const mark = useMutation({
    mutationFn: markRead,
    onMutate: (ids) =>
      qc.setQueryData<NotificationList>(shellKeys.notifications, (old) => {
        if (!old) return old;
        const items = old.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n));
        return { ...old, items, unread: items.filter((n) => !n.read).length };
      }),
    onError: () => void qc.invalidateQueries({ queryKey: shellKeys.notifications }),
  });

  const items = q.data?.items ?? [];
  const now = q.dataUpdatedAt;
  const views: NotificationView[] = items.map((n) => {
    const a = noticeAgo(n.createdAt, now);
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      ago: t(a.key, { n: a.n }),
    };
  });

  return {
    items: views,
    unread: q.data?.unread ?? 0,
    markAll: () => mark.mutate(undefined),
    open: (id: string) => {
      if (items.find((x) => x.id === id && !x.read)) mark.mutate([id]);
    },
  };
}
