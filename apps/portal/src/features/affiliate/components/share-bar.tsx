'use client';

import { CopyOutlined, FacebookFilled, MailOutlined } from '@ant-design/icons';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useOnboardingFlag } from '@/features/onboarding';
import { shareLinks } from '../model';
import styles from './affiliate.module.css';

export function ShareBar({ link, code }: { link: string; code: string }) {
  const t = useTranslations('affiliate.share');
  const toast = useToast();
  // V4-611 (D-85): sao chép / chia sẻ link → bước "Chia sẻ link giới thiệu"
  const shared = useOnboardingFlag();
  const share = () => void shared('affiliate_share');
  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      share();
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
        <SocialLinks link={link} onShare={share} />
      </div>
    </div>
  );
}

/** Facebook / Zalo / email — mở là tính "đã chia sẻ link" (prototype `shFb` / `shZalo` / `shMail`) */
function SocialLinks({ link, onShare }: { link: string; onShare: () => void }) {
  const t = useTranslations('affiliate.share');
  const links = shareLinks(link, t('subject'));
  return (
    <span className={styles.social}>
      <a
        href={links.facebook}
        target="_blank"
        rel="noopener noreferrer"
        title={t('facebook')}
        aria-label={t('facebook')}
        className={styles.facebook}
        onClick={onShare}
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
        onClick={onShare}
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
        onClick={onShare}
      >
        <MailOutlined />
      </a>
    </span>
  );
}
