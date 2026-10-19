'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEscape } from '../hooks/use-escape';
import type { GroupLookup } from '../types';
import { StatusPill } from './cells';
import type { ConfirmRequest } from '@opchub/ui';
import { MemberProfile } from './member-profile';
import styles from './member-drawer.module.css';

interface Props {
  m: AdminMember;
  groups: GroupLookup;
  canVerify: boolean;
  onClose: () => void;
  onDecide: (m: AdminMember, d: 'approve' | 'reject') => Promise<unknown>;
  confirm: (req: ConfirmRequest) => void;
}

/**
 * D-16 "Hồ sơ đăng ký" 480px. Tự vẽ role=dialog (không motion antd — parity dừng đồng hồ).
 * Hồ sơ DN "Chờ xác minh" (D-40) có "Từ chối" (xác nhận, D-32) / "Xác minh doanh nghiệp".
 */
export function MemberDrawer({ m, groups, canVerify, onClose, onDecide, confirm }: Props) {
  const t = useTranslations('members.drawer');
  useEscape(true, onClose);

  const pending = canVerify && m.business?.verification === 'pending';
  const reject = () =>
    confirm({
      title: t('rejectTitle'),
      body: t('rejectBody', { company: m.business?.companyName || m.fullName }),
      okLabel: t('confirm'),
      cancelLabel: t('cancel'),
      danger: true,
      onOk: () => void onDecide(m, 'reject').then(onClose, () => undefined),
    });

  return (
    <div className={styles.mask}>
      <button type="button" aria-label={t('close')} className={styles.backdrop} onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="md-title">
        <div className={styles.head}>
          <button type="button" aria-label={t('close')} className={styles.x} onClick={onClose}>
            ×
          </button>
          <div id="md-title" className={styles.title}>
            {t('title')}
          </div>
          <StatusPill m={m} className={styles.status} />
        </div>
        <MemberProfile m={m} groups={groups} />
        {pending ? (
          <div className={styles.foot}>
            <button type="button" className={styles.reject} onClick={reject}>
              {t('reject')}
            </button>
            <button
              type="button"
              className={styles.approve}
              onClick={() => void onDecide(m, 'approve').catch(() => undefined)}
            >
              {t('approve')}
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
