'use client';

import type { AffiliateBank } from '@opchub/shared/api-domains';
import { App } from 'antd';
import { RegionalDirectorCardHeader } from './regional-director-card-header';
import { RegionalDirectorAssignment } from './regional-director-assignment';
import { useTranslations } from 'next-intl';
import type { DirectorCardProps } from '../types';
import { RegionalDirectorBank } from './regional-director-bank';
import styles from './regional-director.module.css';

export function RegionalDirectorCard({
  slot,
  unassigned,
  disabled,
  busy,
  run,
  appoint,
}: DirectorCardProps) {
  const t = useTranslations('affiliate.directors');
  const { modal } = App.useApp();
  const member = slot.incumbent;
  const name = member?.fullName ?? t('vacant');
  const save = (provinces: string[], bank: AffiliateBank | null) =>
    run({
      kind: 'save',
      region: slot.region,
      body: { version: slot.version, provinces, bank },
    });
  const revoke = () => {
    void modal.confirm({
      title: t('revokeTitle', { name }),
      content: t('revokeNote'),
      okText: t('revoke'),
      cancelText: t('cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await run({ kind: 'revoke', region: slot.region, version: slot.version });
      },
    });
  };
  const toggle = (province: string) => {
    if (disabled || busy) return;
    const next = slot.provinces.includes(province)
      ? slot.provinces.filter((item) => item !== province)
      : [...slot.provinces, province];
    void save(next, slot.bank).catch(() => undefined);
  };
  return (
    <article
      className={styles.card}
      data-region={slot.region}
      aria-label={t(`regions.${slot.region}`)}
    >
      <div className={styles.strip} />
      <RegionalDirectorCardHeader slot={slot} disabled={disabled || busy} revoke={revoke} />
      <div className={styles.stats}>
        <div>
          <small>{t('provinceCount')}</small>
          <b>{t('provincesN', { n: slot.provinces.length })}</b>
        </div>
        <div>
          <small>{t('network')}</small>
          <b>{t('affiliatesN', { n: slot.affiliateCount })}</b>
        </div>
      </div>
      <div className={styles.cardBody}>
        <RegionalDirectorAssignment
          slot={slot}
          unassigned={unassigned}
          disabled={disabled || busy}
          appoint={appoint}
          toggle={toggle}
        />
        <RegionalDirectorBank
          region={slot.region}
          bank={slot.bank}
          disabled={disabled}
          busy={busy}
          save={async (bank) => !!(await save(slot.provinces, bank))}
        />
      </div>
    </article>
  );
}
