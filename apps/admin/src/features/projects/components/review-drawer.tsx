'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useEscape } from '../hooks/use-escape';
import type { ReviewInput } from '../hooks/use-project-actions';
import { drawerActions } from '../model';
import type { AdminProject } from '../types';
import styles from './overlay.module.css';
import { FeatureToggle, ReviewFeedback, ReviewInfo } from './review-body';
import { StatusTag } from './status-badge';

export interface ReviewHandlers {
  approve: (p: AdminProject) => void;
  republish: (p: AdminProject) => void;
  requestChanges: (p: AdminProject, r: ReviewInput) => void;
  reject: (p: AdminProject, r: ReviewInput) => void;
  hide: (p: AdminProject) => void;
  toggleFeature: (p: AdminProject) => void;
}

interface Props {
  project: AdminProject | null;
  busy: boolean;
  onClose: () => void;
  h: ReviewHandlers;
}

/** D-55: drawer phải 560px "Xem & duyệt dự án" — tự vẽ, không motion antd */
export function ReviewDrawer({ project, busy, onClose, h }: Props) {
  useEscape(!!project, onClose);
  if (!project) return null;
  // key theo dự án: đổi dự án thì lý do / lời nhắn về rỗng
  return <Sheet key={project.id} p={project} busy={busy} onClose={onClose} h={h} />;
}

function Sheet({ p, busy, onClose, h }: Omit<Props, 'project'> & { p: AdminProject }) {
  const t = useTranslations('projects.drawer');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const can = drawerActions(p.status);
  const input = { reason, noteHtml: note };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={styles.mask}
        onClick={onClose}
      />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={t('title')}>
        <div className={styles.head}>
          <button type="button" className={styles.x} aria-label={t('close')} onClick={onClose}>
            ×
          </button>
          <span className={styles.title}>{t('title')}</span>
          <StatusTag status={p.status} />
        </div>
        <div className={styles.body}>
          <ReviewInfo p={p} />
          <FeatureToggle p={p} onToggle={() => h.toggleFeature(p)} />
          {can.canReview ? (
            <ReviewFeedback reason={reason} note={note} onReason={setReason} onNote={setNote} />
          ) : null}
        </div>
        <div className={styles.foot}>
          {can.canReview ? (
            <>
              <button
                type="button"
                className={styles.reject}
                disabled={busy}
                onClick={() => h.reject(p, input)}
              >
                {t('reject')}
              </button>
              <button
                type="button"
                className={styles.btn}
                disabled={busy}
                onClick={() => h.requestChanges(p, input)}
              >
                {t('changes')}
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={() => h.approve(p)}
              >
                {t('approve')}
              </button>
            </>
          ) : null}
          {can.canHide ? (
            <button type="button" className={styles.btn} disabled={busy} onClick={() => h.hide(p)}>
              {t('hide')}
            </button>
          ) : null}
          {can.canRepublish ? (
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => h.republish(p)}
            >
              {t('republish')}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
