'use client';

import { IMAGE_ACCEPT, IMAGE_MAX_MB, RichTextField, useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchStats, projectKeys } from '../api';
import { STAGES } from '../model';
import type { FormSet, ProjectFormState } from '../types';
import { Pic } from './bits';
import styles from './form.module.css';
import { readImage } from './read-image';

interface Props {
  f: ProjectFormState;
  set: FormSet;
}

/** Ảnh bìa: kiểm định dạng + 5MB ở client; xem trước bằng data URL tới khi có presigned upload */
function CoverField({ f, set }: Props) {
  const t = useTranslations('projects.form');
  const toast = useToast();
  const pick = (file: File | undefined) => {
    if (!file) return;
    if (file.size / 1024 / 1024 > IMAGE_MAX_MB) return toast(t('coverTooLarge'));
    void readImage(file).then((url) => set('coverUrl', url));
  };
  return (
    <div className={styles.field}>
      {t('cover')}
      {f.coverUrl ? (
        <div className={styles.coverPreview}>
          <Pic src={f.coverUrl} />
          <button
            type="button"
            className={styles.coverRemove}
            onClick={() => set('coverUrl', null)}
          >
            {t('coverRemove')}
          </button>
        </div>
      ) : (
        <label className={styles.coverPick}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1677FF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
          </svg>
          <span className={styles.coverTitle}>{t('coverPick')}</span>
          <span className={styles.coverHint}>{t('coverHint')}</span>
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            className={styles.hidden}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}

/** Lĩnh vực (danh mục đang bật cho dự án — cùng nguồn chip LĨNH VỰC) + giai đoạn */
function CategoryStage({ f, set }: Props) {
  const t = useTranslations('projects');
  const stats = useQuery({ queryKey: projectKeys.stats(), queryFn: fetchStats });
  const cats = stats.data?.categories ?? [];
  return (
    <div className={styles.two14}>
      <label className={styles.field}>
        <span>
          <span className={styles.req}>*</span> {t('form.category')}
        </span>
        <select
          className={styles.select}
          value={f.category}
          onChange={(e) => set('category', e.target.value)}
        >
          <option value="">{t('form.categoryPh')}</option>
          {cats.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {t('form.stage')}
        <select
          className={styles.select}
          value={f.stage}
          onChange={(e) => set('stage', STAGES.find((s) => s === e.target.value) ?? 'idea')}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {t(`stage.${s}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Ảnh bìa, tên, lĩnh vực, giai đoạn, mô tả ngắn/chi tiết, website, tag */
export function BasicSection({ f, set }: Props) {
  const t = useTranslations('projects');
  return (
    <>
      <CoverField f={f} set={set} />
      <label className={styles.field}>
        <span>
          <span className={styles.req}>*</span> {t('form.name')}
        </span>
        <input
          className={styles.input}
          value={f.name}
          placeholder={t('form.namePh')}
          onChange={(e) => set('name', e.target.value)}
        />
      </label>
      <CategoryStage f={f} set={set} />
      <div className={styles.field}>
        <span className={styles.labelRow}>
          <span>
            <span className={styles.req}>*</span> {t('form.summary')}
          </span>
          <span className={styles.count}>{f.summary.length}/160</span>
        </span>
        <input
          className={styles.input}
          value={f.summary}
          maxLength={160}
          aria-label={t('form.summary')}
          placeholder={t('form.summaryPh')}
          onChange={(e) => set('summary', e.target.value)}
        />
      </div>
      <div className={styles.field}>
        {t('form.description')}
        <RichTextField
          value={f.description}
          onChange={(v) => set('description', v)}
          placeholder={t('form.descriptionPh')}
          ariaLabel={t('form.description')}
        />
      </div>
      <div className={styles.two14}>
        <label className={styles.field}>
          {t('form.website')}
          <input
            className={styles.input}
            value={f.website}
            placeholder={t('form.websitePh')}
            onChange={(e) => set('website', e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {t('form.tags')}
          <input
            className={styles.input}
            value={f.tags}
            placeholder={t('form.tagsPh')}
            onChange={(e) => set('tags', e.target.value)}
          />
        </label>
      </div>
    </>
  );
}
