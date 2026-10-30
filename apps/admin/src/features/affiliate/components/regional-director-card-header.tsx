'use client';

import type { DirectorSlot } from '@opchub/shared/api-domains';
import { UserAvatar } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import styles from './regional-director.module.css';

export function RegionalDirectorCardHeader({
  slot,
  disabled,
  revoke,
}: {
  slot: DirectorSlot;
  disabled: boolean;
  revoke: () => void;
}) {
  const t = useTranslations('affiliate.directors');
  const name = slot.incumbent?.fullName ?? t('vacant');
  return (
    <div className={styles.cardHeader}>
      <div className={styles.avatar}>
        <UserAvatar
          name={name}
          size={44}
          fallback="initials"
          text={name.trim().split(/\s+/).at(-1)?.[0] ?? '?'}
          color="var(--soft)"
        />
      </div>
      <div className={styles.identity}>
        <div>
          <b>{name}</b> <span className={styles.region}>{t(`regions.${slot.region}`)}</span>
        </div>
        <small>{slot.incumbent?.email ?? t('vacantHint')}</small>
      </div>
      <Button size="small" danger disabled={disabled || !slot.incumbent} onClick={revoke}>
        {t('revoke')}
      </Button>
    </div>
  );
}
