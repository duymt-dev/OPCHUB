'use client';

import { GROUP_KIND } from '@opchub/shared/api';
import { FieldErrorOf, type FieldErrorProps, invalidProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { nameForIndustry, nameForProvince } from '../model';
import type { GroupField, GroupFormState } from '../types';
import type { FormPatch } from './group-form-fields';
import styles from './group-form.module.css';

interface Props {
  f: GroupFormState;
  set: FormPatch;
  err: (k: GroupField) => FieldErrorProps | undefined;
}

/** D-89 (v4): "Loại nhóm" (tỉnh chung / ngành) + ô "Ngành" khi chọn Nhóm ngành */
export function KindFields({ f, set, err }: Props) {
  const t = useTranslations('groups.form');
  const pick = (kind: GroupFormState['kind']) =>
    set(
      kind === 'province'
        ? { kind, name: nameForProvince(f.name, f.province) }
        : { kind, name: nameForIndustry(f.name, f.province, f.industry) },
    );
  return (
    <>
      <div className={styles.field}>
        <span>
          <span className={styles.req}>*</span> {t('kind')}
        </span>
        <div className={styles.kinds} role="radiogroup" aria-label={t('kind')}>
          {GROUP_KIND.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={f.kind === k}
              className={`${styles.kindOpt} ${f.kind === k ? styles.kindOn : ''}`}
              onClick={() => pick(k)}
            >
              <span className={styles.kindL}>{t(`kinds.${k}`)}</span>
              <span className={styles.kindD}>{t(`kinds.${k}Desc`)}</span>
            </button>
          ))}
        </div>
      </div>
      {f.kind === 'industry' && (
        <label className={styles.field}>
          <span>
            <span className={styles.req}>*</span> {t('industry')}
          </span>
          <input
            className={styles.input}
            value={f.industry}
            placeholder={t('industryPh')}
            {...invalidProps(err('industry'))}
            onChange={(e) =>
              set({
                industry: e.target.value,
                name: nameForIndustry(f.name, f.province, e.target.value),
              })
            }
          />
          <FieldErrorOf e={err('industry')} />
          <span className={styles.hint}>{t('industryHint')}</span>
        </label>
      )}
    </>
  );
}
