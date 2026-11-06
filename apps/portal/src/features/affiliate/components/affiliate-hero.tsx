'use client';

import { useTranslations } from 'next-intl';
import { formatVnd, openInPlace, PAYWALL_PATHS } from '@/features/membership';
import type { MyAffiliate } from '@opchub/shared/api-domains';
import type { useBankForm } from '../hooks/use-bank-form';
import type { ActiveAffiliate } from '../types';
import { BankAccountCard } from './bank-account-card';
import { ShareBar } from './share-bar';
import styles from './affiliate.module.css';
import regionalStyles from './my-region.module.css';

export function AffiliateLocked({ policy }: { policy: MyAffiliate['policy'] }) {
  const t = useTranslations('affiliate');
  return (
    <div className={styles.locked}>
      <span className={styles.eyebrow}>{t('program')}</span>
      <h2 className={styles.headline}>{t('locked.title')}</h2>
      <p className={styles.description}>
        {t.rich('locked.description', {
          rate: policy.rate,
          renewalRate: policy.renewalRate,
          renewalMaxYear: policy.renewalMaxYear,
          per: formatVnd(policy.perAmount),
          biz: formatVnd(policy.bizAmount),
          fund: formatVnd(policy.fundAmount),
          fundRate: policy.fundRate,
          b: (children) => <b>{children}</b>,
        })}
      </p>
      <button
        type="button"
        className={styles.primary}
        onClick={() => openInPlace(PAYWALL_PATHS.pay)}
      >
        {t('locked.pay')}
      </button>
    </div>
  );
}

export function AffiliateHero({
  data,
  bank,
}: {
  data: ActiveAffiliate;
  bank: ReturnType<typeof useBankForm>;
}) {
  const t = useTranslations('affiliate');
  return (
    <div className={styles.hero}>
      <div className={styles.heroColumn}>
        <span className={styles.eyebrow}>{t('program')}</span>
        <h2 className={styles.headline}>{t('hero.title', { rate: data.policy.rate })}</h2>
        <div className={regionalStyles.badges}>
          <span>
            {t.rich('hero.rateBadge', {
              rate: data.policy.rate,
              b: (children) => <b>{children}</b>,
            })}
          </span>
          <span>
            {t.rich('hero.cookieBadge', {
              days: data.policy.cookieDays,
              b: (children) => <b>{children}</b>,
            })}
          </span>
        </div>
        <BankAccountCard bank={data.bank} form={bank} />
      </div>
      <ShareBar link={data.link} code={data.code} />
    </div>
  );
}
