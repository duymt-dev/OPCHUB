'use client';

import { FieldErrorOf, IMAGE_ACCEPT, invalidProps } from '@opchub/ui';
import type { FieldErrorProps } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchStats, projectKeys } from '../api';
import type { PickImage } from '../hooks/use-project-images';
import { STAGES, type SubmitField } from '../model';
import type { ProjectAudience } from '@opchub/shared';

/** Thứ tự ô "Đối tượng tham gia" của prototype (Cá nhân đứng đầu = mặc định) */
const FORM_AUDIENCES: ProjectAudience[] = ['personal', 'student', 'organization', 'business'];
import type { FormSet, ProjectFormState } from '../types';
import { Pic } from './bits';
import { ProvinceField } from './form-province';
import styles from './form.module.css';
import { LocalizedRichTextField } from '@/i18n/localized-ui';
import { PortalAiSuggestButton } from '@/features/shell';

interface Props {
  f: ProjectFormState;
  set: FormSet;
}

/** Lỗi tại ô (BUG-022) */
type Err = { err: (k: SubmitField) => FieldErrorProps | undefined };

/** Ảnh bìa (NA-26): kiểm + xem trước + tải lên storage qua `pickImage`; form chỉ giữ URL */
function CoverField({ f, set, pickImage }: Props & { pickImage: PickImage }) {
  const t = useTranslations('projects.form');
  const pick = (file: File | undefined) => {
    if (file) pickImage(file, f.coverUrl, (url) => set('coverUrl', url));
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
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

/** D-89 (v4): Đối tượng tham gia, Nhóm ngành giải pháp (danh mục bật cho dự án), 5 giai đoạn */
function CategoryStage({ f, set, err }: Props & Err) {
  const t = useTranslations('projects');
  const stats = useQuery({ queryKey: projectKeys.stats(), queryFn: fetchStats });
  const cats = stats.data?.categories ?? [];
  return (
    <div className={styles.two14}>
      <label className={styles.field}>
        <span>
          <span className={styles.req}>*</span> {t('form.audience')}
        </span>
        <select
          className={`${styles.select} ${styles.selectSm}`}
          value={f.audience}
          onChange={(e) =>
            set('audience', FORM_AUDIENCES.find((a) => a === e.target.value) ?? 'personal')
          }
        >
          {FORM_AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {t(`audience.${a}`)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>
          <span className={styles.req}>*</span> {t('form.category')}
        </span>
        <select
          className={styles.select}
          value={f.category}
          {...invalidProps(err('category'))}
          onChange={(e) => set('category', e.target.value)}
        >
          <option value="">{t('form.categoryPh')}</option>
          {cats.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldErrorOf e={err('category')} />
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
              {t(`dev.${s}`)}
            </option>
          ))}
        </select>
      </label>
      <ProvinceField f={f} set={set} />
    </div>
  );
}

/** Ảnh bìa, tên, lĩnh vực, giai đoạn, mô tả ngắn/chi tiết, website, tag */
export function BasicSection({ f, set, pickImage, err }: Props & Err & { pickImage: PickImage }) {
  const t = useTranslations('projects');
  return (
    <>
      <CoverField f={f} set={set} pickImage={pickImage} />
      <label className={styles.field}>
        <span>
          <span className={styles.req}>*</span> {t('form.name')}
        </span>
        <input
          className={styles.input}
          value={f.name}
          placeholder={t('form.namePh')}
          {...invalidProps(err('name'))}
          onChange={(e) => set('name', e.target.value)}
        />
        <FieldErrorOf e={err('name')} />
      </label>
      <CategoryStage f={f} set={set} err={err} />
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
          {...invalidProps(err('summary'))}
          onChange={(e) => set('summary', e.target.value)}
        />
        <FieldErrorOf e={err('summary')} />
        <PortalAiSuggestButton
          kind="project_summary"
          input={{
            title: f.name.slice(0, 300),
            description: f.summary.slice(0, 1500),
            category: f.category.slice(0, 200),
          }}
          apply={(text) => set('summary', text)}
        />
      </div>
      <div className={styles.field}>
        {t('form.description')}
        <LocalizedRichTextField
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
