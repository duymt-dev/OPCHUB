'use client';
import { StatusTag } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { DirectorRegion } from '../types';
import { MyRegionKpis } from './my-region-kpis';
import { MyRegionYears } from './my-region-years';
import { MyRegionAffiliates } from './my-region-affiliates';
import { MyRegionMonths } from './my-region-months';
import styles from './my-region.module.css';

export function MyRegionTab({ data, name }: { data: DirectorRegion; name: string }) {
  const t = useTranslations('affiliate.region');
  const bank = data.bank
    ? `${data.bank.bankName} · ${data.bank.bankNo} · ${data.bank.bankHolder}`
    : '—';
  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2>{t('title', { label: data.label, name })}</h2>
          <p>
            {t('provinces', {
              label: data.label,
              count: data.provinces.length,
              provinces: data.provinces.join(', '),
            })}
          </p>
        </div>
        <StatusTag tone="blue">{t('readOnly')}</StatusTag>
      </header>
      <div className={styles.note}>
        {t.rich('note', { bank, b: (children) => <b>{children}</b> })}
      </div>
      <MyRegionKpis data={data} />
      <MyRegionYears rows={data.years} />
      <MyRegionAffiliates data={data} />
      <MyRegionMonths rows={data.months} />
    </div>
  );
}
