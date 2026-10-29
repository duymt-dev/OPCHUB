'use client';

import type { AdminRoom, RoomRename } from '@opchub/shared/api-domains';
import { type ConfirmRequest, useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { deleteRoom, groupKeys, renameRoom } from '../api';
import { useErrorToast } from './use-groups';

export interface TopicCallbacks {
  /** Đồng bộ bản nháp form (phòng tự đặt tên giữ theo tên) để "Lưu thay đổi" không thêm lại tên cũ */
  onRenamed: (before: AdminRoom, after: AdminRoom) => void;
  onDeleted: (room: AdminRoom) => void;
}

/**
 * D-111 (Q-V42-709-1): đổi tên / xoá mềm chủ đề có sẵn. Xoá luôn qua hộp xác nhận; API ghi audit_logs và
 * phát `room.reload` để Portal tải lại danh sách chủ đề.
 */
export function useGroupTopics(groupId: string, cb: TopicCallbacks) {
  const t = useTranslations('groups');
  const toast = useToast();
  const onError = useErrorToast();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
      qc.invalidateQueries({ queryKey: groupKeys.rooms(groupId) }),
    ]);

  const rename = useMutation({
    mutationFn: ({ room, body }: { room: AdminRoom; body: RoomRename }) =>
      renameRoom(groupId, room.id, body),
    onSuccess: (next, { room }) => {
      cb.onRenamed(room, next);
      toast(t('toast.topicRenamed', { name: next.name }));
      return refresh();
    },
    onError,
  });

  const del = useMutation({
    mutationFn: (room: AdminRoom) => deleteRoom(groupId, room.id),
    onSuccess: (_, room) => {
      setConfirm(null);
      cb.onDeleted(room);
      toast(t('toast.topicDeleted', { name: room.name }));
      return refresh();
    },
    onError,
  });

  const remove = (room: AdminRoom) =>
    setConfirm({
      title: t('confirm.topicTitle'),
      body: t('confirm.topicBody', { name: room.name }),
      okLabel: t('confirm.delete'),
      cancelLabel: t('confirm.cancel'),
      danger: true,
      onOk: () => del.mutate(room),
    });

  return {
    rename: (room: AdminRoom, body: RoomRename) => rename.mutate({ room, body }),
    remove,
    confirm,
    closeConfirm: () => setConfirm(null),
    busy: rename.isPending || del.isPending,
  };
}
