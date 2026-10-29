'use client';

import type { BotActivity } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { agoOf } from '../model';
import styles from './bots.module.css';

/** D-36 tab Nhật ký tự động — trống khi worker chưa chạy */
export function ActivityLog({ items, now }: { items: BotActivity[]; now: number }) {
  const t = useTranslations('bots');
  return (
    <>
      {!items.length ? <div className={styles.empty}>{t('log.empty')}</div> : null}
      <div className={styles.log}>
        {items.map((x) => {
          const a = agoOf(x.createdAt, now);
          return (
            <div key={x.id} className={styles.logRow}>
              <i className={styles.logDot} />
              <span className={styles.logText}>{x.text}</span>
              <span className={styles.logAgo}>{t(`ago.${a.key}`, { n: a.n })}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
