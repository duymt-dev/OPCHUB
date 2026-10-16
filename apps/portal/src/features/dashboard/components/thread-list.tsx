'use client';

import type { LiveThread } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useAgo } from '../hooks/use-ago';
import { lastInitial } from '../model';
import styles from './thread-list.module.css';

interface Props {
  items: LiveThread[];
  now: number;
  onJoin: (groupId: string) => void;
}

/** P-06: "Thảo luận mới trong cộng đồng" — "Tham gia thảo luận →" mở chat nhóm */
export function ThreadList({ items, now, onJoin }: Props) {
  const t = useTranslations('dashboard.threads');
  const ago = useAgo(now);
  if (!items.length) return null;
  return (
    <section className={styles.wrap}>
      <h3 className={styles.title}>{t('title')}</h3>
      <div className={styles.grid}>
        {items.map((th) => (
          <article key={th.id} className={styles.card}>
            <div className={styles.head}>
              <span className={styles.initial} style={{ background: th.author.color }}>
                {lastInitial(th.author.name)}
              </span>
              <div className={styles.who}>
                <span className={styles.name}>{th.author.name}</span>
                <span className={styles.role}>
                  {th.author.role} · {ago.long(th.at)}
                </span>
              </div>
            </div>
            <span className={styles.body}>{th.body}</span>
            {th.reply ? (
              <div className={styles.reply}>
                <b>{th.reply.name}:</b> {th.reply.body}
              </div>
            ) : null}
            <div className={styles.foot}>
              <span className={styles.meta}>
                {t('meta', { n: th.replyCount, groups: th.groupNames.join(', ') })}
              </span>
              <button type="button" className={styles.join} onClick={() => onJoin(th.groupId)}>
                {t('join')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
