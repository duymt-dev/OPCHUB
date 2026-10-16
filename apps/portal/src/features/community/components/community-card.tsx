'use client';

import { GroupCard } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { avatarsOf, coverOf, fallbackCover, toneOf } from '../media';
import { formatCount, onlineOf } from '../model';
import type { CommunityGroup } from '../types';
import styles from './community.module.css';

export interface CardHandlers {
  onOpenChat: (g: CommunityGroup) => void;
  onLeave: (g: CommunityGroup) => void;
  onCancel: (g: CommunityGroup) => void;
  onJoin: (g: CommunityGroup) => void;
}

function Actions({ g, h }: { g: CommunityGroup; h: CardHandlers }) {
  const t = useTranslations('community.card');
  if (g.joined)
    return (
      <>
        <button type="button" className={styles.primary} onClick={() => h.onOpenChat(g)}>
          {t('openChat')}
        </button>
        <button
          type="button"
          className={`${styles.ghost} ${styles.leave}`}
          onClick={() => h.onLeave(g)}
        >
          {t('leave')}
        </button>
      </>
    );
  if (g.pending)
    return (
      <>
        <div className={styles.pendingBox}>{t('pending')}</div>
        <button type="button" className={styles.ghost} onClick={() => h.onCancel(g)}>
          {t('cancel')}
        </button>
      </>
    );
  return (
    <button type="button" className={styles.primary} onClick={() => h.onJoin(g)}>
      {t('join')}
    </button>
  );
}

export function CommunityCard({ g, handlers }: { g: CommunityGroup; handlers: CardHandlers }) {
  const t = useTranslations('community.card');
  return (
    <GroupCard
      name={g.name}
      description={g.description}
      coverSrc={coverOf(g.id)}
      coverFallbackSrc={fallbackCover(g.id)}
      tag={g.region}
      tagColor={toneOf(g.order).fg}
      privacy={g.joinMode === 'approval' ? t('approval') : t('public')}
      avatars={avatarsOf(g.order)}
      membersLabel={t('members', { count: formatCount(g.memberCount) })}
      onlineLabel={t('online', { count: onlineOf(g.memberCount) })}
      weeklyLabel={t('weekly', { count: formatCount(g.weeklyActive) })}
      actions={<Actions g={g} h={handlers} />}
    />
  );
}
