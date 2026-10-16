'use client';

import { useTranslations } from 'next-intl';
import { useInvestorComments } from '../hooks/use-investors';
import { lastInitial, stamp } from '../model';
import styles from './investor-thread.module.css';

/** "Trao đổi với nhà đầu tư": bong bóng trái (nhà đầu tư) / phải (Admin) như prototype */
export function InvestorThread({ investorKey }: { investorKey: string }) {
  const d = useTranslations('investors.drawer');
  const q = useInvestorComments(investorKey);
  const list = q.data ?? [];
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.h}>{d('thread')}</span>
        <span className={styles.count}>{d('count', { n: list.length })}</span>
      </div>
      {q.isSuccess && list.length === 0 ? (
        <div className={styles.empty}>{d('threadEmpty')}</div>
      ) : null}
      {list.map((c) =>
        c.fromInvestor ? (
          <div key={c.id} className={styles.inv}>
            <div className={styles.ini}>{lastInitial(c.authorName)}</div>
            <div className={styles.col}>
              <span className={styles.meta}>
                <b className={styles.who}>{c.authorName}</b> · {stamp(c.createdAt)}
              </span>
              <div className={styles.bubbleIn}>{c.body}</div>
            </div>
          </div>
        ) : (
          <div key={c.id} className={styles.me}>
            <span className={styles.meta}>
              {stamp(c.createdAt)} · <b className={styles.meName}>{c.authorName}</b>
            </span>
            <div className={styles.bubbleMe}>{c.body}</div>
          </div>
        ),
      )}
    </div>
  );
}
