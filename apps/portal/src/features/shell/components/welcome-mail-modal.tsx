'use client';

import type { WelcomeMailPreview } from '@opchub/shared/api-domains';
import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import styles from './welcome-mail-modal.module.css';

interface Props {
  mail: WelcomeMailPreview;
  name: string;
  onClose: () => void;
}

/**
 * P-05: xem trước mail chào mừng vừa gửi (hộp tự vẽ, không motion).
 * D-30 / D-47: không có mật khẩu tạm; D-91 (5): dòng "Mật khẩu" chỉ nhắc mật khẩu người dùng tự đặt.
 */
export function WelcomeMailModal({ mail, name, onClose }: Props) {
  const t = useTranslations('shell.welcome');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.mask} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="wm-title">
        <div className={styles.head}>
          <span className={styles.check} aria-hidden="true">
            ✓
          </span>
          <div className={styles.headText}>
            <b id="wm-title" className={styles.headTitle}>
              {t('sent')}
            </b>
            <span className={styles.headSub}>
              {t('to', { email: mail.to, subject: mail.subject })}
            </span>
          </div>
          <button type="button" className={styles.close} aria-label={t('close')} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.scroll}>
          <div className={styles.paper}>
            <div className={styles.mail}>
              <div className={styles.brand}>
                <img src="/opchub-logo.png" alt="OPC Hub" />
                <span>opchub.community</span>
              </div>
              <div className={styles.content}>
                <b className={styles.hello}>{t('hello', { name })}</b>
                <span>{mail.intro}</span>
                {mail.showAccess ? (
                  <>
                    <div className={styles.access}>
                      <span className={styles.key}>{t('loginUrl')}</span>
                      <a href={mail.loginUrl}>{mail.loginUrl}</a>
                      <span className={styles.key}>{t('username')}</span>
                      <span className={styles.val}>{mail.to}</span>
                      <span className={styles.key}>{t('password')}</span>
                      <span className={styles.val}>{t('passwordOwn')}</span>
                    </div>
                    <span className={styles.note}>{t('accessNote')}</span>
                  </>
                ) : null}
                <MailExtras mail={mail} />
              </div>
              <div className={styles.footer}>{t('footer')}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Quy định + nút đăng nhập + tài liệu đính kèm */
function MailExtras({ mail }: { mail: WelcomeMailPreview }) {
  const t = useTranslations('shell.welcome');
  return (
    <>
      {mail.showRules ? (
        <div className={styles.rules}>
          <b>{t('rules')}</b>
          {mail.rules.map((r, i) => (
            <div key={r} className={styles.rule}>
              <span className={styles.ruleNo}>{i + 1}</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div>
        <a className={styles.cta} href={mail.loginUrl}>
          {t('loginNow')}
        </a>
      </div>
      {mail.showGuide && mail.attachments.length ? (
        <div className={styles.atts}>
          <b>{t('attachments')}</b>
          {mail.attachments.map((a) => (
            <a key={a.url + a.title} className={styles.att} href={a.url}>
              <Icon name="paperclip" size={16} stroke="#1677FF" />
              <span className={styles.attText}>
                <span className={styles.attTitle}>{a.title || a.url}</span>
                <span className={styles.attUrl}>{a.url}</span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </>
  );
}
