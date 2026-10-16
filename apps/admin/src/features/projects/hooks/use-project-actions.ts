'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ConfirmRequest } from '../components/confirm-dialog';
import { reviewNote } from '../model';
import type { AdminProject } from '../types';
import { useProjectBulk } from './use-project-bulk';
import { useReviewProject } from './use-projects';

export interface ReviewInput {
  reason: string;
  noteHtml: string;
}

/**
 * Thao tác của màn kiểm duyệt. Phá huỷ (xoá, ẩn, từ chối) luôn qua hộp xác nhận (luật 10,
 * bài học G4); API ghi audit_logs. Duyệt / yêu cầu chỉnh sửa / xuất bản lại làm ngay như prototype.
 */
export function useProjectActions(onDrawerClose: () => void) {
  const t = useTranslations('projects');
  const toast = useToast();
  const review = useReviewProject();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const done = (msg: string) => {
    setConfirm(null);
    onDrawerClose();
    toast(msg);
  };
  const more = useProjectBulk({ ask: setConfirm, done });

  const decide = (
    p: AdminProject,
    decision: 'approve' | 'republish' | 'request_changes' | 'reject' | 'hide',
    msg: 'approved' | 'changes' | 'rejected' | 'hidden',
    note?: string,
  ) =>
    review.mutate(
      { id: p.id, body: note ? { decision, note } : { decision } },
      { onSuccess: () => done(t(`toast.${msg}`, { name: p.name })) },
    );

  const requestChanges = (p: AdminProject, r: ReviewInput) => {
    const note = reviewNote(r.reason, r.noteHtml);
    if (!note) return toast(t('toast.needNote'));
    decide(p, 'request_changes', 'changes', note);
  };

  const reject = (p: AdminProject, r: ReviewInput) => {
    if (!r.reason) return toast(t('toast.needReason'));
    setConfirm({
      title: t('confirm.rejectTitle'),
      body: t('confirm.rejectOne', { name: p.name, reason: r.reason }),
      okLabel: t('confirm.reject'),
      onOk: () => decide(p, 'reject', 'rejected', reviewNote(r.reason, r.noteHtml)),
    });
  };

  const hide = (p: AdminProject) =>
    setConfirm({
      title: t('confirm.hideTitle'),
      body: t('confirm.hideOne', { name: p.name }),
      okLabel: t('confirm.hide'),
      onOk: () => decide(p, 'hide', 'hidden'),
    });

  return {
    ...more,
    confirm,
    closeConfirm: () => setConfirm(null),
    busy: review.isPending || more.busy,
    approve: (p: AdminProject) => decide(p, 'approve', 'approved'),
    republish: (p: AdminProject) => decide(p, 'republish', 'approved'),
    requestChanges,
    reject,
    hide,
  };
}
