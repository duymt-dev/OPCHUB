'use client';

import { FieldErrorOf, invalidProps, translateErrors } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormErrors } from '@/lib/use-form-errors';
import type { CategoryFormErrors } from '../hooks/use-categories';
import type { CategoryField } from '../model';
import { CATEGORY_COLORS, type CategoryDraft, type CategoryScope } from '../types';
import styles from './categories.module.css';
import ui from './settings.module.css';

/** D-89 v4: thêm 'Nhóm ngành mạng lưới' (scope `net`) */
const SCOPES: CategoryScope[] = ['project', 'biz', 'net'];

/** Form "Thêm lĩnh vực mới" / "Sửa lĩnh vực" (D-67, D-68) — giữ bản nháp đang gõ */
export function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: CategoryDraft;
  onSave: (d: CategoryDraft, done: () => void, fe: CategoryFormErrors) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('settings.cat');
  const c = useTranslations('settings.common');
  const [d, setD] = useState(initial);
  const fe = useFormErrors<CategoryField>();
  const isEdit = !!d.id;
  const submit = () =>
    onSave(d, () => setD(initial), {
      check: fe.check,
      fromApi: fe.fromApi,
      translate: (errs) => translateErrors(errs, (e) => t(e)),
    });
  const toggleScope = (k: CategoryScope) => {
    fe.clear('scope');
    setD((x) => ({
      ...x,
      scope: x.scope.includes(k) ? x.scope.filter((s) => s !== k) : [...x.scope, k],
    }));
  };

  return (
    <div className={styles.form}>
      <span className={styles.formTitle}>{isEdit ? t('editTitle') : t('addTitle')}</span>
      <div className={styles.formRow}>
        <input
          className={styles.name}
          value={d.name}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          {...invalidProps(fe.err('name'))}
          onChange={(e) => {
            fe.clear('name');
            setD({ ...d, name: e.target.value });
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <ColorPicker value={d.color} onPick={(color) => setD({ ...d, color })} />
      </div>
      <FieldErrorOf e={fe.err('name')} />
      <div
        className={styles.formRow2}
        role="group"
        aria-label={t('applyTo')}
        {...invalidProps(fe.err('scope'))}
      >
        <span className={styles.apply}>{t('applyTo')}</span>
        <ScopeChecks value={d.scope} onToggle={toggleScope} />
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
      <FieldErrorOf e={fe.err('scope')} />
    </div>
  );
}

function ColorPicker({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  const t = useTranslations('settings.cat');
  return (
    <div className={styles.colors} role="radiogroup" aria-label={t('cols.name')}>
      {CATEGORY_COLORS.map((col) => (
        <button
          key={col}
          type="button"
          role="radio"
          aria-checked={value === col}
          aria-label={t('color', { c: col })}
          className={`${styles.color} ${value === col ? styles.colorOn : ''}`}
          style={{ ['--c' as string]: col }}
          onClick={() => onPick(col)}
        />
      ))}
    </div>
  );
}

function ScopeChecks({
  value,
  onToggle,
}: {
  value: CategoryScope[];
  onToggle: (k: CategoryScope) => void;
}) {
  const t = useTranslations('settings.cat');
  return SCOPES.map((k) => {
    const on = value.includes(k);
    return (
      <button
        key={k}
        type="button"
        role="checkbox"
        aria-checked={on}
        className={styles.scope}
        onClick={() => onToggle(k)}
      >
        <span className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</span>
        {t(`scopeLong.${k}`)}
      </button>
    );
  });
}
