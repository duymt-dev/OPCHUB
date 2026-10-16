'use client';

import type { ProjectDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { STAGE_TONE } from '../model';
import { DETAIL_TABS, type DetailTab } from '../types';
import { Mono, Pic, Tag, Stroke } from './bits';
import styles from './detail.module.css';

const fmtPhone = (p: string) => p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');

interface Props {
  p: ProjectDetail;
  commentCount: number;
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
  onFollow: () => void;
  onBack: () => void;
}

/** Breadcrumb + ảnh bìa + tên/giai đoạn + theo dõi + liên hệ + tab */
export function DetailHero({ p, commentCount, tab, onTab, onFollow, onBack }: Props) {
  const t = useTranslations('projects');
  const { email, phone } = p.contact;
  const shown = fmtPhone(phone);
  return (
    <>
      <nav className={styles.crumb} aria-label="breadcrumb">
        <button type="button" className={styles.crumbLink} onClick={onBack}>
          {t('detail.crumb')}
        </button>
        <span>/</span>
        <span className={styles.crumbCur}>{p.name}</span>
      </nav>
      <div className={styles.heroCard}>
        <div className={styles.cover}>
          <Pic src={p.coverUrl} />
        </div>
        <div className={styles.heroRow}>
          <Mono name={p.name} tone={p.tone} size={96} />
          <div className={styles.heroText}>
            <div className={styles.heroTitle}>
              <span className={styles.heroName}>{p.name}</span>
              <span className={styles.heroStage}>
                <Tag tone={STAGE_TONE[p.stage]}>{t(`stage.${p.stage}`)}</Tag>
              </span>
            </div>
            <span className={styles.heroShort}>{p.summary}</span>
          </div>
          <div className={styles.heroActs}>
            <button
              type="button"
              className={`${styles.followBtn} ${p.followedByMe ? styles.followOn : ''}`}
              onClick={onFollow}
            >
              {p.followedByMe ? t('follow.on') : t('follow.off')}
            </button>
            <a
              className={styles.iconBtn}
              href={`mailto:${email}`}
              title={t('detail.emailTitle', { email })}
            >
              <Stroke size={18}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </Stroke>
            </a>
            <a
              className={styles.iconBtn}
              href={`https://zalo.me/${phone}`}
              target="_blank"
              rel="noreferrer"
              title={t('detail.zaloTitle', { phone: shown })}
            >
              <span className={styles.zalo}>Zalo</span>
            </a>
            <a
              className={`${styles.iconBtn} ${styles.callBtn}`}
              href={`tel:${phone}`}
              title={t('detail.callTitle', { phone: shown })}
            >
              <Stroke size={18}>
                <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" />
              </Stroke>
            </a>
          </div>
        </div>
        <Contacts p={p} />
        <HeroTabs tab={tab} onTab={onTab} commentCount={commentCount} />
      </div>
    </>
  );
}

/** Dải liên hệ: Email, Zalo, Điện thoại, Địa chỉ */
function Contacts({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.detail');
  const { email, phone, address } = p.contact;
  const shown = fmtPhone(phone);
  const contacts = [
    { k: 'email', href: `mailto:${email}`, v: email },
    { k: 'zalo', href: `https://zalo.me/${phone}`, v: shown },
    { k: 'phone', href: `tel:${phone}`, v: shown },
  ] as const;
  return (
    <div className={styles.contacts}>
      {contacts.map((c) => (
        <div key={c.k} className={styles.contact}>
          <span className={styles.contactL}>{t(c.k)}</span>
          <a className={styles.contactV} href={c.href}>
            {c.v}
          </a>
        </div>
      ))}
      <div className={styles.contact}>
        <span className={styles.contactL}>{t('address')}</span>
        <span className={styles.contactText}>{address}</span>
      </div>
    </div>
  );
}

function HeroTabs({ tab, onTab, commentCount }: Pick<Props, 'tab' | 'onTab' | 'commentCount'>) {
  const t = useTranslations('projects');
  return (
    <div className={styles.tabs} role="tablist">
      {DETAIL_TABS.map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={tab === k}
          className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`}
          onClick={() => onTab(k)}
        >
          {k === 'feedback' ? t('tabs.feedback', { n: commentCount }) : t(`tabs.${k}`)}
        </button>
      ))}
    </div>
  );
}
