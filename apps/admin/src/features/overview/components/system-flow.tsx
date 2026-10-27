'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { flowCards } from '../flow';
import { useOverview } from '../hooks/use-overview';
import styles from './system-flow.module.css';

/** D-89 v4 "Luồng hệ thống — Số liệu trực tiếp từ các module" (5 thẻ, bấm để mở module) */
export function SystemFlow() {
  const t = useTranslations('overview.flow');
  const data = useOverview().data;
  return (
    <section className={styles.card} aria-labelledby="system-flow-title">
      <div className={styles.head}>
        <span id="system-flow-title" className={styles.title}>
          {t('title')}
        </span>
        <span className={styles.sub}>{t('sub')}</span>
      </div>
      <div className={styles.grid}>
        {data &&
          flowCards(data.flow).map((c) => (
            <Link key={c.key} href={c.href} className={styles.item}>
              <div className={styles.row}>
                <span className={styles.name}>{t(`${c.key}.name`)}</span>
                <span className={c.done ? styles.done : styles.todo}>
                  {c.done ? t('done') : t('todo')}
                </span>
              </div>
              <span className={styles.value}>{c.value}</span>
              <span className={styles.note}>{t(`${c.key}.sub`, c.sub)}</span>
              <span className={styles.cta}>{t(`${c.key}.cta`)} →</span>
            </Link>
          ))}
      </div>
    </section>
  );
}
