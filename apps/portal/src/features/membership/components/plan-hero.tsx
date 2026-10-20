'use client';

import { useTranslations } from 'next-intl';
import { PerkIcon } from './plan-icons';
import styles from './plan-hero.module.css';

const br = () => <br />;
const PERKS = ['perk0', 'perk1', 'perk2'] as const;

/** Đầu cột gói (UP-07 §23.5): logo, tiêu đề, ảnh hero, 3 lợi ích */
export function PlanHero() {
  const t = useTranslations('membership.plan');
  return (
    <>
      <div className={styles.head}>
        <div className={styles.text}>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo tĩnh trong /public */}
          <img src="/opchub-logo.png" alt={t('logoAlt')} className={styles.logo} />
          <span className={styles.title}>{t.rich('title', { br })}</span>
          <span className={styles.lead}>{t('lead')}</span>
        </div>
        <div className={styles.hero} aria-hidden="true" />
      </div>
      <div className={styles.perks}>
        {PERKS.map((k, i) => (
          <div key={k} className={styles.perk}>
            <span className={styles.perkIcon} data-i={i}>
              <PerkIcon i={i as 0 | 1 | 2} />
            </span>
            <span>{t.rich(k, { br })}</span>
          </div>
        ))}
      </div>
    </>
  );
}
