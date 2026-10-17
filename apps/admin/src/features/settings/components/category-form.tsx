'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CATEGORY_COLORS, type CategoryDraft, type CategoryScope } from '../types';
import styles from './categories.module.css';
import ui from './settings.module.css';

const SCOPES: CategoryScope[] = ['project', 'biz'];

/** Form "Thêm lĩnh vực mới" / "Sửa lĩnh vực" (D-67, D-68) — giữ bản nháp đang gõ */
export function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: CategoryDraft;
  onSave: (d: CategoryDraft, done: () => void) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('settings.cat');
  const c = useTranslations('settings.common');
  const [d, setD] = useState(initial);
  const isEdit = !!d.id;
  const submit = () => onSave(d, () => setD(initial));
  const toggleScope = (k: CategoryScope) =>
    setD((x) => ({
      ...x,
      scope: x.scope.includes(k) ? x.scope.filter((s) => s !== k) : [...x.scope, k],
    }));

  return (
    <div className={styles.form}>
      <span className={styles.formTitle}>{isEdit ? t('editTitle') : t('addTitle')}</span>
      <div className={styles.formRow}>
        <input
          className={styles.name}
          value={d.name}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          onChange={(e) => setD({ ...d, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <div className={styles.colors} role="radiogroup" aria-label={t('cols.name')}>
          {CATEGORY_COLORS.map((col) => (
            <button
              key={col}
              type="button"
              role="radio"
              aria-checked={d.color === col}
              aria-label={t('color', { c: col })}
              className={`${styles.color} ${d.color === col ? styles.colorOn : ''}`}
              style={{ ['--c' as string]: col }}
              onClick={() => setD({ ...d, color: col })}
            />
          ))}
        </div>
      </div>
      <div className={styles.formRow2}>
        <span className={styles.apply}>{t('applyTo')}</span>
        {SCOPES.map((k) => {
          const on = d.scope.includes(k);
          return (
            <button
              key={k}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={styles.scope}
              onClick={() => toggleScope(k)}
            >
              <span className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</span>
              {t(k)}
            </button>
          );
        })}
        <div className={styles.formBtns}>
          {isEdit ? (
            <button type="button" className={ui.btnDefault} onClick={onCancel}>
              {c('cancel')}
            </button>
          ) : null}
          <button type="button" className={ui.btnPrimary} onClick={submit}>
            {isEdit ? c('save') : t('add')}
          </button>
        </div>
      </div>
    </div>
  );
}
