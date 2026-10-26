'use client';

import { Checkbox, Input } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { CommunityGroup } from '../types';
import styles from './join-modal.module.css';
import { JoinSummary } from './join-summary';

interface Props {
  group: CommunityGroup | null;
  busy: boolean;
  onClose: () => void;
  /** Đã kiểm điều kiện đồng ý nội quy ở đây; lời giới thiệu không bắt buộc (D-71) */
  onSubmit: (g: CommunityGroup, intro: string) => void;
  onInvalid: (message: string) => void;
}

function JoinForm({
  group: g,
  busy,
  onClose,
  onSubmit,
  onInvalid,
}: Props & { group: CommunityGroup }) {
  const t = useTranslations('community');
  const [agree, setAgree] = useState(false);
  const [intro, setIntro] = useState('');
  const submit = () => {
    if (!agree) return onInvalid(t('toast.needAgree'));
    if (!busy) onSubmit(g, intro.trim());
  };

  return (
    <>
      <JoinSummary g={g} onClose={onClose} />
      <div className={styles.content}>
        <label className={styles.field}>
          <span>{t('join.intro')}</span>
          <span>{t('join.introOptional')}</span>
          <Input.TextArea
            rows={3}
            className={styles.textarea ?? ''}
            value={intro}
            placeholder={t('join.introPlaceholder')}
            onChange={(e) => setIntro(e.target.value)}
          />
        </label>
        <Checkbox
          className={styles.agree ?? ''}
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        >
          {t('join.agree')}
        </Checkbox>
        <div className={styles.buttons}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            {t('join.cancel')}
          </button>
          <button
            type="button"
            className={`${styles.submit} ${agree ? '' : styles.submitIdle}`}
            onClick={submit}
          >
            {t('join.submitOpen')}
          </button>
        </div>
      </div>
    </>
  );
}

/** P-23 / P-24: popup đăng ký tham gia nhóm — vào ngay (D-71, không có URL — D-39) */
export function JoinModal(props: Props) {
  const { group, onClose } = props;
  useEffect(() => {
    if (!group) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [group, onClose]);
  if (!group) return null;
  return (
    <div className={styles.mask}>
      {/* Bấm nền để đóng; bàn phím dùng Esc (useEffect trên) */}
      <button
        type="button"
        className={styles.backdrop}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={group.name}>
        <JoinForm key={group.id} {...props} group={group} />
      </div>
    </div>
  );
}
