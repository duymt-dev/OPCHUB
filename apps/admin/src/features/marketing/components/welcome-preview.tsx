'use client';

import type { WelcomeMail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './welcome-preview.module.css';

interface Props {
  tpl: WelcomeMail;
  name: string;
  email: string;
}

/** Mật khẩu tạm không bao giờ hiện lại — chỉ lúc gửi (prototype hiện chấm khi xem lại) */
const MASK = '••••••••';

/** Bản xem trước email chào mừng (tab Email tự động + hộp "Xem" ở Nhật ký gửi) */
export function WelcomePreview({ tpl, name, email }: Props) {
  const t = useTranslations('marketing.mail');
  const atts = tpl.attachments.filter((a) => a.title.trim() || a.url.trim());
  return (
    <div className={styles.frame}>
      <div className={styles.mail}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo tĩnh trong khung email */}
          <img src="/opchub-logo.png" alt="OPC Hub" />
          <span>{t('brand')}</span>
        </div>
        <div className={styles.content}>
          <b className={styles.hello}>{t('hello', { name })}</b>
          <span>{tpl.intro}</span>
          {tpl.showPassword ? (
            <>
              <div className={styles.cred}>
                <span className={styles.k}>{t('loginUrl')}</span>
                <span className={styles.v}>{tpl.loginUrl}</span>
                <span className={styles.k}>{t('username')}</span>
                <span className={styles.v}>{email}</span>
                <span className={styles.k}>{t('password')}</span>
                <b className={styles.pw}>{MASK}</b>
              </div>
              <span className={styles.note}>{t('changePw')}</span>
            </>
          ) : null}
          {tpl.showRules ? (
            <div className={styles.list}>
              <b>{t('rules')}</b>
              {tpl.rules.map((r, i) => (
                <div key={`${i}-${r}`} className={styles.rule}>
                  <span className={styles.n}>{i + 1}</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          ) : null}
          <span className={styles.cta}>{t('login')}</span>
          {tpl.showGuide && atts.length ? (
            <div className={`${styles.list} ${styles.atts}`}>
              <b>{t('atts')}</b>
              {atts.map((a, i) => (
                <div key={`${i}-${a.url}`} className={styles.att}>
                  <span className={styles.attTitle}>{a.title || a.url}</span>
                  <span className={styles.attUrl}>{a.url}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.foot}>{t('footer')}</div>
      </div>
    </div>
  );
}
