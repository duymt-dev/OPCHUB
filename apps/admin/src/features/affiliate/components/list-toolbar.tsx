'use client';

import { FilterBar } from '@opchub/ui';
import { Segmented, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { affiliateMonthLabel } from '../model';
import type { AffiliateParams, AffiliateStatusCounts } from '../types';
import styles from './affiliate.module.css';
import { AffiliateExportButton } from './affiliate-export-button';

/** Calendar choices are presentation only; arbitrary selected historical months remain usable. */
function calendarMonths(selected: string) {
  const date = new Date(Date.now() + 7 * 3_600_000);
  const keys = Array.from({ length: 24 }, (_, i) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - i, 1)).toISOString().slice(0, 7),
  );
  return [...new Set([...(selected ? [selected] : []), ...keys])].sort().reverse();
}

export function ListToolbar({
  params,
  update,
  counts,
}: {
  params: AffiliateParams;
  update: (patch: Partial<AffiliateParams>) => void;
  counts: AffiliateStatusCounts;
}) {
  const t = useTranslations('affiliate');
  const [draft, setDraft] = useState({ source: params.q, value: params.q });
  if (draft.source !== params.q) setDraft({ source: params.q, value: params.q });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const placeholder = t(params.tab === 'aff' ? 'searchAff' : 'searchCom');
  return (
    <div className={styles.toolbar}>
      <div className={styles.search} data-ro-ok>
        <FilterBar
          search={{
            value: draft.value,
            placeholder,
            onChange: (value) => {
              setDraft({ source: params.q, value });
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => update({ q: value, page: 1 }), 300);
            },
          }}
        />
      </div>
      {params.tab === 'com' ? (
        <div data-ro-ok>
          <Segmented
            value={params.status}
            options={(['all', 'recorded', 'paid', 'cancelled'] as const).map((value) => ({
              value,
              label: (
                <span>
                  {t(`status.${value}`)}
                  {counts[value] !== undefined ? (
                    <small className={styles.filterCount}>{counts[value]}</small>
                  ) : null}
                </span>
              ),
            }))}
            onChange={(status) => update({ status, page: 1 })}
          />
        </div>
      ) : (
        <>
          <span className={styles.hint}>{t('autoHint')}</span>
          <label className={styles.month} data-ro-ok>
            {t('month')}
            <Select
              aria-label={t('month')}
              value={params.month}
              options={[
                { value: '', label: t('allMonths') },
                ...calendarMonths(params.month).map((value) => ({
                  value,
                  label: affiliateMonthLabel(value),
                })),
              ]}
              onChange={(month) => update({ month, page: 1 })}
            />
          </label>
        </>
      )}
      <AffiliateExportButton params={params} />
    </div>
  );
}
