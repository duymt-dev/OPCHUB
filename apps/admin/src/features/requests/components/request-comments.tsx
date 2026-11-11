'use client';

import { SafeHtml } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useRequestComments } from '../hooks/use-requests';
import { commentTime, lastInitial, staffTone } from '../model';
import { CommentComposer } from './comment-composer';
import styles from './request-comments.module.css';

/** "Trao đổi nội bộ": bình luận HTML (SafeHtml) + nhân sự được gắn tên */
export function RequestComments({ code }: { code: string }) {
  const locale = useLocale();
  const d = useTranslations('requests.drawer');
  const q = useRequestComments(code);
  const list = q.data ?? [];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.h}>{d('thread')}</span>
        <span className={styles.count}>{d('threadCount', { n: list.length })}</span>
      </div>
      {list.map((c) => (
        <div key={c.id} className={styles.item}>
          <span className={`${styles.ini} ${styles[staffTone(c.authorName)]}`}>
            {lastInitial(c.authorName)}
          </span>
          <div className={styles.col}>
            <span className={styles.meta}>
              <b className={styles.who}>{c.authorName}</b> · {commentTime(c.createdAt, locale)}
            </span>
            <SafeHtml html={c.body} className={`rich ${styles.bubble}`} />
            {c.mentions.length ? (
              <div className={styles.ments}>
                {c.mentions.map((m) => (
                  <span key={m} className={styles.ment}>
                    @{m}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <CommentComposer code={code} />
    </div>
  );
}
