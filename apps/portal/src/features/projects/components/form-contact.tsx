'use client';

import { FieldErrorOf, type FieldErrorProps, invalidProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { SubmitField } from '../model';
import type { FormSet, ProjectFormState } from '../types';
import base from './form.module.css';
import styles from './form-repo-fund.module.css';

interface Props {
  f: ProjectFormState;
  set: FormSet;
  err: (k: SubmitField) => FieldErrorProps | undefined;
}

/**
 * Khối "Liên hệ công khai" (BUG-016, QT-09 bước 6, NĐ 13/2023): chỉ hai kênh chủ dự án tự chọn
 * công khai trên trang chi tiết. Tạo mới điền sẵn từ hồ sơ; xoá trống = không công khai.
 */
export function ContactSection({ f, set, err }: Props) {
  const t = useTranslations('projects.form');
  return (
    <div className={styles.boxGray}>
      <div className={styles.boxHead}>
        <span className={styles.boxTitle}>{t('contactBox')}</span>
        <span className={base.hint}>{t('contactBoxSub')}</span>
      </div>
      <div className={base.two}>
        <label className={base.field}>
          {t('contactEmail')}
          <input
            type="email"
            className={base.input}
            value={f.contactEmail}
            placeholder={t('contactEmailPh')}
            {...invalidProps(err('contactEmail'))}
            onChange={(e) => set('contactEmail', e.target.value)}
          />
          <FieldErrorOf e={err('contactEmail')} />
        </label>
        <label className={base.field}>
          {t('contactPhone')}
          <input
            type="tel"
            className={base.input}
            value={f.contactPhone}
            placeholder={t('contactPhonePh')}
            {...invalidProps(err('contactPhone'))}
            onChange={(e) => set('contactPhone', e.target.value)}
          />
          <FieldErrorOf e={err('contactPhone')} />
        </label>
      </div>
    </div>
  );
}
