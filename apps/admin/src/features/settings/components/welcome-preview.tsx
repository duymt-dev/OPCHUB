'use client';

import type { WelcomeMail } from '@opchub/shared/api-domains';
import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './welcome-preview.module.css';

/** "Xem trước" email chào mừng theo bản nháp đang sửa (prototype wPrev) */
export function WelcomePreview({ mail }: { mail: WelcomeMail }) {
  const t = useTranslations('settings.mail');
  const atts = mail.attachments
    .filter((a) => a.title.trim() || a.url.trim())
    .map((a) => ({ title: a.title || a.url, url: a.url }));
  const email = t('sampleEmail');

  return (
    <div className={styles.col}>
      <span className={styles.label}>{t('preview')}</span>
      <div className={styles.bg}>
        <div className={styles.mail}>
          <div className={styles.top}>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo tĩnh trong email */}
            <img src="/opchub-logo.png" alt="OPC Hub" className={styles.logo} />
            <span className={styles.brand}>{t('brand')}</span>
          </div>
          <div className={styles.body}>
            <b className={styles.hello}>{t('hello', { name: t('sampleName') })}</b>
            <span>{mail.intro}</span>
            {mail.showPassword ? (
              <>
                <div className={styles.creds}>
                  <span className={styles.k}>{t('loginUrl')}</span>
                  <a
                    href={mail.loginUrl}
                    className={styles.link}
                    onClick={(e) => e.preventDefault()}
                  >
                    {mail.loginUrl}
                  </a>
                  <span className={styles.k}>{t('username')}</span>
                  <span className={styles.wrap}>{email}</span>
                  <span className={styles.k}>{t('tempPw')}</span>
                  <b className={styles.pw}>{t('samplePw')}</b>
                </div>
                <span className={styles.small}>{t('changePw')}</span>
              </>
            ) : null}
            {mail.showRules ? (
              <div className={styles.rules}>
                <b className={styles.rulesTitle}>{t('rulesTitle')}</b>
                {mail.rules.map((r, i) => (
                  <div key={i} className={styles.rule}>
                    <span className={styles.num}>{i + 1}</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div>
              <span className={styles.cta}>{t('loginNow')}</span>
            </div>
            {mail.showGuide && atts.length ? (
              <div className={styles.atts}>
                <b className={styles.rulesTitle}>{t('attachments')}</b>
                {atts.map((a, i) => (
                  <div key={i} className={styles.att}>
                    <Icon name="paperclip" size={16} stroke="#1677FF" />
                    <span className={styles.attText}>
                      <span className={styles.attTitle}>{a.title}</span>
                      <span className={styles.attUrl}>{a.url}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className={styles.foot}>{t('footer')}</div>
        </div>
      </div>
    </div>
  );
}
