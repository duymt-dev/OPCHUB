'use client';

import { FilterBar } from '@opchub/ui';
import { Segmented } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { AffiliateParams, AffiliateStatusCounts } from '../types';
import styles from './affiliate.module.css';
import { AffiliateExportButton } from './affiliate-export-button';
import layout from './agent-toolbar.module.css';
import { AgentMonthSelect } from './agent-month-select';

export function ListToolbar({
  params,
  update,
  counts,
  defaultRate,
}: {
  params: AffiliateParams;
  update: (patch: Partial<AffiliateParams>) => void;
  counts: AffiliateStatusCounts;
  defaultRate?: number | undefined;
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
    <div className={`${styles.toolbar} ${params.tab === 'aff' ? layout.toolbar : ''}`}>
      <div className={styles.search} data-ro-ok data-affiliate-search>
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
          <span className={styles.hint} data-affiliate-hint>
            {defaultRate === undefined ? t('autoHint') : t('autoRateHint', { rate: defaultRate })}
          </span>
          <AgentMonthSelect value={params.month} onChange={(month) => update({ month, page: 1 })} />
        </>
      )}
      <AffiliateExportButton params={params} />
    </div>
  );
}
