'use client';

import type { JoinRequest, RoomMember } from '@opchub/shared/api-domains';
import { UserAvatar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { fmtNumber, vnDate } from '../format';
import styles from './info-panel.module.css';

const SHIELD = 'M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z';

interface RequestsProps {
  requests: JoinRequest[];
  onDecide: (r: JoinRequest, ok: boolean) => void;
}

/** Chủ nhóm duyệt yêu cầu tham gia ngay trên bảng (D-43) */
function JoinRequests({ requests, onDecide }: RequestsProps) {
  const t = useTranslations('chat.panel');
  return (
    <>
      <div className={styles.ownerTag}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={SHIELD} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
        {t('owner')}
      </div>
      <div className={styles.pendingHead}>
        <span className={styles.pendingTitle}>{t('pending')}</span>
        {requests.length ? <span className={styles.count}>{requests.length}</span> : null}
      </div>
      {requests.map((r) => (
        <div key={r.userId} className={styles.req}>
          <div className={styles.reqHead}>
            <UserAvatar name={r.fullName} size={32} src={r.avatarUrl ?? undefined} />
            <div className={styles.reqWho}>
              <span className={styles.reqName}>{r.fullName}</span>
              <span className={styles.small}>{vnDate(r.requestedAt)}</span>
            </div>
          </div>
          <span className={styles.intro}>{t('intro', { text: r.intro })}</span>
          <div className={styles.reqActions}>
            <button type="button" className={styles.reject} onClick={() => onDecide(r, false)}>
              {t('reject')}
            </button>
            <button type="button" className={styles.approve} onClick={() => onDecide(r, true)}>
              {t('approve')}
            </button>
          </div>
        </div>
      ))}
      {requests.length === 0 ? <span className={styles.none}>{t('noRequests')}</span> : null}
      <div className={styles.hr} />
    </>
  );
}

interface Props extends RequestsProps {
  isOwner: boolean;
  members: RoomMember[];
  total: number;
}

export function PanelMembers({ isOwner, requests, onDecide, members, total }: Props) {
  const t = useTranslations('chat.panel');
  return (
    <>
      {isOwner ? <JoinRequests requests={requests} onDecide={onDecide} /> : null}
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
          {p.isModerator ? <span className={styles.mod}>{t('moderator')}</span> : null}
        </div>
      ))}
    </>
  );
}
