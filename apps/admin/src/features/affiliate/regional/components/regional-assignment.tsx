'use client';
import { Select } from 'antd';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RegionalSlot } from '@opchub/shared/api-domains';
import { useRegionalCandidates } from '../hooks/use-regional-directors';
import { useRegionalConfirmations } from '../hooks/use-regional-confirmations';
import type { useRegionalWrites } from '../hooks/use-regional-writes';
import styles from './regional.module.css';

export function RegionalAssignment({
  slot,
  disabled,
  forceOpen,
  onClose,
  mutate,
}: {
  slot: RegionalSlot;
  disabled: boolean;
  forceOpen: boolean;
  onClose: () => void;
  mutate: ReturnType<typeof useRegionalWrites>['mutateAsync'];
}) {
  const t = useTranslations('affiliate.regional');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const query = useRegionalCandidates(slot.region, search, open || forceOpen);
  const { change } = useRegionalConfirmations(slot, mutate, query.data?.items ?? []);
  const options = [...(slot.member ? [slot.member] : []), ...(query.data?.items ?? [])]
    .filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i)
    .map((m) => ({ value: m.id, label: `${m.fullName} · ${m.email}` }));
  return (
    <div className={styles.assignment}>
      <small className={styles.sectionTitle}>{t('assignment')}</small>
      <label className={styles.field}>
        {t('member')}
        <Select
          virtual={false}
          aria-label={`${t('member')} ${slot.label}`}
          showSearch={{ filterOption: false, onSearch: setSearch }}
          options={options}
          value={slot.member?.id ?? null}
          placeholder={t('chooseMember')}
          loading={query.isFetching}
          open={open || forceOpen}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) onClose();
          }}
          disabled={disabled}
          onChange={change}
        />
        <span className={slot.member ? styles.good : styles.warning}>
          {slot.member ? t('freeHint') : t('vacantHint')}
        </span>
      </label>
      <div className={styles.field}>
        <span>{t('region')}</span>
        <span className={styles.regionValue}>{slot.label}</span>
      </div>
    </div>
  );
}
