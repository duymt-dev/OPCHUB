'use client';

import { useTranslations } from 'next-intl';
import type { RevenueIdentityProps } from '../revenue-types';
import styles from './revenue-sharing.module.css';

export function RevenueDirectorIdentity({ row, open, onToggle }: RevenueIdentityProps) {
  const t = useTranslations('revenue');
  return (
    <button
      className={styles.identity}
      data-ro-ok
      disabled={!row.directorId}
      onClick={onToggle}
      aria-expanded={open}
    >
      <span aria-hidden>{open ? '▾' : '▸'}</span>
      <span>
        <b>{row.name ?? t(row.directorId ? 'missingIdentity' : 'vacant')}</b>
        <small>
          {row.current
            ? t('scope', { region: t(`regions.${row.region}`), count: row.provinces.length })
            : `${t(`regions.${row.region}`)} · ${t('former')}`}
          {row.email ? ` · ${row.email}` : ''}
        </small>
      </span>
    </button>
  );
}
