'use client';

import type { WelcomeMail } from '@opchub/shared/api-domains';
import { Icon } from '@opchub/ui';
import { createTranslator, useTranslations } from 'next-intl';
import source from '../../../../messages/vi/settings/mail.json';
import styles from './welcome-preview.module.css';

const emailText = createTranslator({ locale: 'vi', messages: source.mail });

/** "Xem trước" email chào mừng theo bản nháp đang sửa (prototype wPrev) */
export function WelcomePreview({ mail }: { mail: WelcomeMail }) {
  const ui = useTranslations('settings.mail');
  const t = emailText;
  const atts = mail.attachments
    .filter((a) => a.title.trim() || a.url.trim())
    .map((a) => ({ title: a.title || a.url, url: a.url }));

  return (
    <div className={styles.col}>
      <span className={styles.label}>{ui('preview')}</span>
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
            {mail.showAccess ? (
              <>
                <div className={styles.access}>
                  <span className={styles.key}>{t('loginUrl')}</span>
                  <span className={styles.link}>{mail.loginUrl}</span>
                  <span className={styles.key}>{t('username')}</span>
                  <span className={styles.val}>{t('sampleEmail')}</span>
                  <span className={styles.key}>{t('password')}</span>
                  <span className={styles.val}>{t('passwordOwn')}</span>
                </div>
                <span className={styles.note}>{t('accessNote')}</span>
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
