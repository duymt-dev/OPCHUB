'use client';

import type { RoomMember } from '@opchub/shared/api-domains';
import { UserAvatar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { fmtNumber } from '../format';
import styles from './info-panel.module.css';

const SHIELD = 'M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z';

/** Chủ nhóm: nhãn trên danh sách (D-71 bỏ mục duyệt yêu cầu; chủ nhóm giữ quyền khác của D-43) */
function OwnerTag() {
  const t = useTranslations('chat.panel');
  return (
    <>
      <div className={styles.ownerTag}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={SHIELD} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
        {t('owner')}
      </div>
      <div className={styles.hr} />
    </>
  );
}

interface Props {
  isOwner: boolean;
  members: RoomMember[];
  total: number;
}

export function PanelMembers({ isOwner, members, total }: Props) {
  const t = useTranslations('chat.panel');
  return (
    <>
      {isOwner ? <OwnerTag /> : null}
      <div className={styles.sectionTitle}>{t('memberCount', { n: fmtNumber(total) })}</div>
      {members.map((p) => (
        <div key={p.id} className={styles.person}>
          <div className={styles.pAv}>
            <UserAvatar name={p.name} size={32} src={p.avatarUrl ?? undefined} />
            <i className={styles.dot} data-online={p.online} />
          </div>
          <div className={styles.col}>
            <span className={styles.pName}>{p.name}</span>
            <span className={styles.small}>{p.title}</span>
          </div>
          {/* GR-R02: nhãn Chủ nhóm / Giảng viên; thành viên thường không nhãn */}
          {p.groupRole !== 'member' ? (
            <span className={styles.mod} data-role={p.groupRole}>
              {t(p.groupRole === 'owner' ? 'roleOwner' : 'roleLecturer')}
            </span>
          ) : null}
        </div>
      ))}
    </>
  );
}
