'use client';

import { GroupCard, groupCoverSrc } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatCount, onlineOf, toneOf } from '../model';
import type { CommunityGroup } from '../types';
import styles from './community.module.css';

export interface CardHandlers {
  onOpenChat: (g: CommunityGroup) => void;
  onLeave: (g: CommunityGroup) => void;
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
      coverSrc={groupCoverSrc(g.coverUrl)}
      tag={g.region}
      tagColor={toneOf(g.order).fg}
      // D-71: mọi nhóm vào ngay, không còn "Cần duyệt"
      privacy={t('public')}
      avatars={g.avatars}
      membersLabel={t('members', { count: formatCount(g.memberCount) })}
      onlineLabel={t('online', { count: onlineOf(g.memberCount) })}
      weeklyLabel={t('weekly', { count: formatCount(g.weeklyActive) })}
      actions={<Actions g={g} h={handlers} />}
    />
  );
}
