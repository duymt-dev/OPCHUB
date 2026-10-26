'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useId } from 'react';
import styles from './declaration.module.css';

interface Props {
  /** Bước 1 đã xong: "Tài khoản" (Cá nhân) / "Người đại diện" (DN) */
  doneStep: string;
  currentStep: string;
  title: string;
  intro: string;
  label: string;
  busy: boolean;
  onLogout: () => void;
  onSave: () => void;
  children: ReactNode;
}

/**
 * Khung popup khai báo (prototype v4 `Popup · Thông tin cá nhân` / `Khai báo doanh nghiệp`):
 * không nút đóng, Esc / bấm nền không đóng — chỉ "Đăng xuất" hoặc "Lưu & tiếp tục →".
 */
export function DeclarationFrame(p: Props) {
  const t = useTranslations('declaration');
  const titleId = useId();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <>
      <div className={styles.mask} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-screen-label={p.label}
        className={styles.dialog}
      >
        <div className={styles.top}>
          <div className={styles.steps}>
            <span className={styles.stepDone}>
              <span className={styles.dotDone}>✓</span>
              {p.doneStep}
            </span>
            <span className={styles.stepLine} />
            <span className={styles.stepNow}>
              <span className={styles.dotNow}>2</span>
              {p.currentStep}
            </span>
            <span className={styles.stepLine} />
            <span className={styles.step}>
              <span className={styles.dot}>3</span>
              {t('steps.fee')}
            </span>
          </div>
          <div className={styles.heading}>
            <div id={titleId} className={styles.title}>
              {p.title}
            </div>
            <div className={styles.intro}>{p.intro}</div>
          </div>
        </div>
        {p.children}
        <div className={styles.foot}>
          <button type="button" className={styles.logout} onClick={p.onLogout}>
            {t('logout')}
          </button>
          <button type="button" className={styles.save} disabled={p.busy} onClick={p.onSave}>
            {t('save')}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
