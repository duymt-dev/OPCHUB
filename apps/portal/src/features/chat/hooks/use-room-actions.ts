'use client';

import type { ChatGroup, JoinRequest } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ApiError } from '@/lib/api-client';
import { chatUnreadKey } from '@/lib/chat-unread';
import { chatKeys, decideRequest, joinGroup, markRead, reportMessage } from '../api';
import type { ReportReason } from '../types';

/** Thao tác cấp phòng/nhóm: đã đọc, duyệt yêu cầu, báo cáo, tham gia (chủ đề do Admin tạo — NA-09) */
export function useRoomActions(group: ChatGroup | null) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('chat');
  const gid = group?.id ?? '';
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : t('toast.error'));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: chatKeys.overview() });
    void qc.invalidateQueries({ queryKey: chatKeys.rooms(gid) });
  };

  const read = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      refresh();
      void qc.invalidateQueries({ queryKey: chatUnreadKey });
    },
  });
  const { mutate: readMutate } = read;
  const markRoomRead = useCallback((roomId: string) => readMutate(roomId), [readMutate]);

  const decide = useMutation({
    mutationFn: (a: { req: JoinRequest; ok: boolean }) =>
      decideRequest(gid, a.req.userId, a.ok ? 'approve' : 'reject'),
    onSuccess: (_d, a) => {
      void qc.invalidateQueries({ queryKey: chatKeys.requests(gid) });
      void qc.invalidateQueries({ queryKey: chatKeys.all });
      const key = a.ok ? 'panel.approved' : 'panel.rejected';
      toast(t(key, { name: a.req.fullName, group: group?.name ?? '' }));
    },
    onError: fail,
  });

  const report = useMutation({
    mutationFn: (a: { messageId: string; reason: ReportReason; note: string }) =>
      reportMessage(a.messageId, { reason: a.reason, ...(a.note ? { note: a.note } : {}) }),
    onError: fail,
  });

  const join = useMutation({ mutationFn: joinGroup, onSuccess: refresh, onError: fail });

  return {
    markRead: markRoomRead,
    decide: (req: JoinRequest, ok: boolean) => decide.mutate({ req, ok }),
    report: (messageId: string, reason: ReportReason, note: string, roomId: string) =>
      report.mutateAsync({ messageId, reason, note }).then(() => {
        void qc.invalidateQueries({ queryKey: chatKeys.roomMessages(roomId) });
        toast(t('report.sent'));
      }),
    join: (groupId: string) => join.mutateAsync(groupId),
  };
}
