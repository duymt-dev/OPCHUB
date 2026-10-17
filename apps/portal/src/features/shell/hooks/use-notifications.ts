'use client';

import type { Notification, NotificationList } from '@opchub/shared/api-domains';
import type { NotificationView } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { fetchNotifications, markRead, shellKeys } from '../api';
import { noticeAgo } from '../model';
import { useNotificationPush } from './use-notification-push';

/** Thông báo của người đang đăng nhập (D-29) — đánh dấu đã đọc cập nhật cache ngay */
export function useNotifications() {
  const t = useTranslations('shell.ago');
  const qc = useQueryClient();
  const router = useRouter();
  const q = useQuery({ queryKey: shellKeys.notifications, queryFn: fetchNotifications });
  useNotificationPush();

  const applyRead = (ids?: string[]) =>
    qc.setQueryData<NotificationList>(shellKeys.notifications, (old) => {
      if (!old) return old;
      const items = old.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n));
      return { ...old, items, unread: items.filter((n) => !n.read).length };
    });

  const mark = useMutation({
    mutationFn: markRead,
    onMutate: (ids) => applyRead(ids),
    onError: () => void qc.invalidateQueries({ queryKey: shellKeys.notifications }),
  });

  const items = q.data?.items ?? [];
  // mốc "x phút trước" = lúc nhận dữ liệu (không gọi Date.now trong render)
  const now = q.dataUpdatedAt;
  const views: NotificationView[] = items.map((n: Notification) => {
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
    /** Mở thông báo: đánh dấu đã đọc rồi đi tới deep-link */
    open: (id: string) => {
      const n = items.find((x) => x.id === id);
      if (!n) return;
      if (!n.read) mark.mutate([id]);
      router.push(n.link);
    },
  };
}
