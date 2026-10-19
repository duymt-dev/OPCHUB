'use client';

import { GroupCover, groupCoverSrc } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatCount, toneOf } from '../model';
import type { CommunityGroup } from '../types';
import styles from './join-modal.module.css';

/** Phần đầu popup tham gia: ảnh bìa + tên, nhãn, mô tả, nội quy */
export function JoinSummary({ g, onClose }: { g: CommunityGroup; onClose: () => void }) {
  const t = useTranslations('community');
  const approval = g.joinMode === 'approval';
  const tone = toneOf(g.order);
  const rules = t.raw('join.rules') as string[];
  return (
    <>
      <GroupCover src={groupCoverSrc(g.coverUrl)} size="modal">
        <button
          type="button"
          className={styles.close}
          aria-label={t('join.close')}
          onClick={onClose}
        >
          ×
        </button>
        <div className={styles.title}>
          <span className={styles.eyebrow}>{t('join.eyebrow')}</span>
          <span className={styles.name}>{g.name}</span>
        </div>
      </GroupCover>
      <div className={styles.summary}>
        <div className={styles.tags}>
          {/* Màu nhãn khu vực là dữ liệu tông nhóm (động) */}
          <span className={styles.tag} style={{ background: tone.bg, color: tone.fg }}>
            {g.region}
          </span>
          <span className={`${styles.tag} ${styles.tagMuted}`}>
            {approval ? t('card.approval') : t('card.public')}
          </span>
          <span className={styles.count}>
            {t('card.members', { count: formatCount(g.memberCount) })}
          </span>
        </div>
        <div className={styles.desc}>{g.description}</div>
        <div className={styles.rules}>
          <div className={styles.rulesTitle}>{t('join.rulesTitle')}</div>
          {rules.map((r) => (
            <div key={r} className={styles.rule}>
              <span className={styles.tick}>✓</span>
              {r}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
