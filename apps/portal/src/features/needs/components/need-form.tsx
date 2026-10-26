'use client';

import { NEED_DESC_MIN, type NeedCreateInput } from '@opchub/shared/api-domains';
import { provinces } from '@opchub/shared/fixtures';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { draftIssue, emptyDraft, type NeedDraft, toCreate } from '../model';
import {
  AreaSection,
  ContactSection,
  InfoSection,
  ScaleSection,
  TermsSection,
} from './form-sections';
import styles from './form.module.css';

export interface FormStore {
  name: string;
  province: string;
}

interface Props {
  store: FormStore;
  contact: { name: string; email: string };
  busy: boolean;
  onCancel: () => void;
  onSubmit: (body: NeedCreateInput) => void;
}

/**
 * P-114 / P-115: popup "Đăng nhu cầu" 5 mục — kiểm phía client theo thứ tự prototype (toast lỗi
 * đầu tiên), server kiểm lại bằng `needCreateSchema`. Hiển thị ngay, không cần Admin duyệt (D-75).
 */
export function NeedForm({ store, contact, busy, onCancel, onSubmit }: Props) {
  const t = useTranslations('needs');
  const toast = useToast();
  const [d, setD] = useState<NeedDraft>(() =>
    emptyDraft({
      province: store.province || (provinces[0]?.[0] ?? ''),
      contactName: contact.name,
      email: contact.email,
    }),
  );
  const set = (patch: Partial<NeedDraft>) => setD((x) => ({ ...x, ...patch }));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = () => {
    const issue = draftIssue(d, NEED_DESC_MIN);
    if (issue) return toast(t(`issue.${issue}`));
    if (!busy) onSubmit(toCreate(d));
  };

  return (
    <div className={styles.mask}>
      {/* Bấm nền để đóng; bàn phím dùng Esc (useEffect trên) */}
      <button
        type="button"
        className={styles.backdrop}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onCancel}
      />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={t('form.title')}>
        <div className={styles.head}>
          <span className={styles.headTitle}>{t('form.title')}</span>
          <span className={styles.headSub}>{t('form.sub', { store: store.name })}</span>
        </div>
        <div className={styles.body}>
          <InfoSection d={d} set={set} />
          <ScaleSection d={d} set={set} />
          <AreaSection d={d} set={set} />
          <TermsSection d={d} set={set} />
          <ContactSection d={d} set={set} />
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {t('form.cancel')}
          </button>
          <button type="button" className={styles.submit} disabled={busy} onClick={submit}>
            {t('form.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
