'use client';

import type { NotificationList } from '@opchub/shared/api-domains';
import type { NotificationView } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { fetchNotifications, markRead, shellKeys } from '../api';
import { adminLinkOf, noticeAgo } from '../model';
import { ADMIN_NAV } from '../nav';
import { useNumberText } from '@/i18n/use-number-text';

/**
 * Thông báo của TK quản trị (D-04, D-29). BUG-023: mở thông báo → đánh dấu đã đọc rồi điều hướng
 * nếu `link` là route Admin (khớp prefix menu); link Portal bỏ qua.
 */
export function useNotifications() {
  const numberText = useNumberText();
  const t = useTranslations('common.ago');
  const qc = useQueryClient();
  const router = useRouter();
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
      ago: t(a.key, { n: numberText(a.n) }),
    };
  });

  return {
    items: views,
    unread: q.data?.unread ?? 0,
    markAll: () => mark.mutate(undefined),
    open: (id: string) => {
      const n = items.find((x) => x.id === id);
      if (n && !n.read) mark.mutate([id]);
      const to = n
        ? adminLinkOf(
            n.link,
            ADMIN_NAV.map((x) => x.href),
          )
        : null;
      if (to) router.push(to);
    },
  };
}
