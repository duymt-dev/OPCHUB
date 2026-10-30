'use client';

import type { DirectorRegion, DirectorSlot } from '@opchub/shared/api-domains';
import { Button, Select } from 'antd';
import { useTranslations } from 'next-intl';
import styles from './regional-director.module.css';

export function RegionalDirectorAssignment({
  slot,
  unassigned,
  disabled,
  appoint,
  toggle,
}: {
  slot: DirectorSlot;
  unassigned: string[];
  disabled: boolean;
  appoint: (region: DirectorRegion) => void;
  toggle: (province: string) => void;
}) {
  const t = useTranslations('affiliate.directors');
  const member = slot.incumbent;
  return (
    <>
      <div className={styles.assignment}>
        <div className={styles.sectionTitle}>{t('assignment')}</div>
        <label className={styles.field}>
          {t('member')}
          <Select
            disabled={disabled || !!member}
            value={member?.id}
            placeholder={t('chooseMember')}
            options={
              member ? [{ value: member.id, label: `${member.fullName} · ${member.email}` }] : []
            }
            open={false}
            onClick={() => {
              if (!member && !disabled) appoint(slot.region);
            }}
          />
          <small className={styles.exempt}>{member ? t('exempt') : t('vacantHint')}</small>
        </label>
        {!member ? (
          <Button disabled={disabled} onClick={() => appoint(slot.region)}>
            {t('appoint')}
          </Button>
        ) : null}
        <label className={styles.field}>
          {t('region')}
          <Select
            disabled
            value={slot.region}
            options={[{ value: slot.region, label: t(`regions.${slot.region}`) }]}
          />
        </label>
      </div>
      <div className={styles.provinceSection}>
        <div className={styles.provinceHeading}>
          <span className={styles.sectionTitle}>{t('provinces')}</span>
          <small>{t('toggleProvince')}</small>
        </div>
        <div className={styles.chips}>
          {[...slot.provinces, ...unassigned].map((province) => (
            <button
              type="button"
              key={province}
              disabled={disabled}
              aria-pressed={slot.provinces.includes(province)}
              onClick={() => toggle(province)}
            >
              {province}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
