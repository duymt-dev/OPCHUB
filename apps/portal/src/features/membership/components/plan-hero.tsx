'use client';

import { useTranslations } from 'next-intl';
import { PerkIcon } from './plan-icons';
import styles from './plan-hero.module.css';

const br = () => <br />;
const PERKS = ['perk0', 'perk1', 'perk2'] as const;

/** Đầu Bảng giá v4 (prototype `svhead`): nhãn, tiêu đề, mô tả căn giữa + 3 lợi ích */
export function PlanHero() {
  const t = useTranslations('membership.plan');
  return (
    <>
      <div className={styles.head}>
        <span className={styles.kicker}>{t('kicker')}</span>
        <span className={styles.title}>{t('title')}</span>
        <span className={styles.lead}>{t('lead')}</span>
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
