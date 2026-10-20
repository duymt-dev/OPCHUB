'use client';

import { CopyOutlined, FacebookFilled, MailOutlined } from '@ant-design/icons';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { shareLinks } from '../model';
import styles from './affiliate.module.css';

export function ShareBar({ link, code }: { link: string; code: string }) {
  const t = useTranslations('affiliate.share');
  const toast = useToast();
  const links = shareLinks(link, t('subject'));
  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(message);
    } catch {
      toast(t('failed'));
    }
  };
  return (
    <div className={styles.heroColumn}>
      <span className={styles.lightLabel}>{t('link')}</span>
      <div className={styles.shareRow}>
        <div className={styles.link} title={link}>
          {link}
        </div>
        <button
          type="button"
          className={styles.primary}
          aria-label={t('copy')}
          onClick={() => void copy(link, t('copiedLink'))}
        >
          <CopyOutlined aria-hidden />
          {t('copy')}
        </button>
      </div>
      <div className={styles.codeRow}>
        <span className={styles.lightLabel}>{t('code')}</span>
        <button
          type="button"
          title={t('copyCode')}
          aria-label={t('copyCode')}
          className={styles.code}
          onClick={() => void copy(code, t('copiedCode'))}
        >
          {code}
        </button>
        <span className={styles.social}>
          <a
            href={links.facebook}
            target="_blank"
            rel="noopener noreferrer"
            title={t('facebook')}
            aria-label={t('facebook')}
            className={styles.facebook}
          >
            <FacebookFilled />
          </a>
          <a
            href={links.zalo}
            target="_blank"
            rel="noopener noreferrer"
            title={t('zalo')}
            aria-label={t('zalo')}
            className={styles.zalo}
          >
            Zalo
          </a>
          <a
            href={links.email}
            target="_blank"
            rel="noopener noreferrer"
            title={t('email')}
            aria-label={t('email')}
            className={styles.email}
          >
            <MailOutlined />
          </a>
        </span>
      </div>
    </div>
  );
}
