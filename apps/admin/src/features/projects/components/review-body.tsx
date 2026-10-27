'use client';

import { RichTextField, SafeHtml } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { infoRows, type InfoLabels } from '../model';
import { REVIEW_REASONS, type AdminProject } from '../types';
import styles from './review.module.css';

function useInfoLabels(): InfoLabels {
  const t = useTranslations('projects');
  return {
    stage: {
      idea: t('stage.idea'),
      developing: t('stage.developing'),
      mvp: t('stage.mvp'),
      growth: t('stage.growth'),
      launched: t('stage.launched'),
    },
    none: t('val.none'),
    noRepo: t('val.noRepo'),
    repoPublic: t('val.repoPublic'),
    repoPrivate: t('val.repoPrivate'),
    visPublic: t('val.visPublic'),
    visPrivate: t('val.visPrivate'),
    noFunding: t('val.noFunding'),
    funding: (amount, equity) => t('val.funding', { amount, equity }),
  };
}

/** Ảnh bìa, tên, tóm tắt, thẻ, bảng thông tin, mô tả, ghi chú lần duyệt trước */
export function ReviewInfo({ p }: { p: AdminProject }) {
  const t = useTranslations('projects');
  const rows = infoRows(p, useInfoLabels());
  return (
    <>
      <div className={styles.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh bìa mẫu, tự host sau */}
        <img className={styles.img} src={p.coverUrl} alt="" />
      </div>
      <div className={styles.titleBlock}>
        <span className={styles.name}>{p.name}</span>
        <span className={styles.short}>{p.summary}</span>
      </div>
      <div className={styles.tags}>
        {p.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
      <div>
        {rows.map((r) => (
          <div key={r.key} className={styles.row}>
            <span className={styles.label}>{t(`info.${r.key}`)}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>
      <div className={styles.detail}>
        <span className={styles.detailTitle}>{t('drawer.detail')}</span>
        <span className={styles.detailText}>{p.description}</span>
      </div>
      {p.reviewNote ? (
        <div className={styles.note}>
          <b>{t('drawer.prevNote')}</b>{' '}
          <SafeHtml html={p.reviewNote} className={`rich ${styles.noteBody}`} />
        </div>
      ) : null}
    </>
  );
}

/** Công tắc "Đặt làm dự án nổi bật tuần" — chỉ dự án đang hiển thị */
export function FeatureToggle({ p, onToggle }: { p: AdminProject; onToggle: () => void }) {
  const t = useTranslations('projects.drawer');
  const live = p.status === 'published';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={p.featured}
      aria-disabled={!live}
      className={`${styles.feat} ${live ? '' : styles.featOff}`}
      onClick={onToggle}
    >
      <span className={styles.featStar}>★</span>
      <span className={styles.featText}>
        <span className={styles.featTitle}>{t('feature')}</span>
        <span className={styles.featHint}>{t('featureHint')}</span>
      </span>
      <span className={`${styles.switch} ${p.featured ? styles.switchOn : ''}`}>
        <span className={styles.knob} />
      </span>
    </button>
  );
}

interface FeedbackProps {
  reason: string;
  note: string;
  onReason: (v: string) => void;
  onNote: (html: string) => void;
}

/** Lý do + lời nhắn gửi chủ dự án (khi yêu cầu chỉnh sửa / từ chối) */
export function ReviewFeedback({ reason, note, onReason, onNote }: FeedbackProps) {
  const t = useTranslations('projects.drawer');
  return (
    <div className={styles.feedback}>
      <span className={styles.feedbackTitle}>{t('feedback')}</span>
      <select
        className={styles.select}
        aria-label={t('reasonLabel')}
        value={reason}
        onChange={(e) => onReason(e.target.value)}
      >
        <option value="">{t('reasonPlaceholder')}</option>
        {REVIEW_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <RichTextField
        value={note}
        onChange={onNote}
        minHeight={90}
        placeholder={t('notePlaceholder')}
        ariaLabel={t('noteLabel')}
      />
    </div>
  );
}
