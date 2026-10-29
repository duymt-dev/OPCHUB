'use client';

import { useTranslations } from 'next-intl';
import type { FormSet, ProjectFormState } from '../types';
import styles from './form.module.css';

export function ProvinceField({ f, set }: { f: ProjectFormState; set: FormSet }) {
  const t = useTranslations('stores.filter');
  return (
    <label className={styles.field}>
      {t('province')}
      <input
        className={styles.input}
        value={f.province}
        maxLength={80}
        readOnly={!!f.storeId}
        onChange={(e) => set('province', e.target.value)}
      />
    </label>
  );
}
