'use client';

import { groupCoverSrc } from '@opchub/ui';
import { Checkbox } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { fmtNumber } from '../format';
import type { ChatGroup } from '../types';
import styles from './group-preview.module.css';

interface Props {
  group: ChatGroup;
  onClose: () => void;
  onJoin: (g: ChatGroup) => void;
}

/** Xem trước nhóm chưa tham gia: phủ lên vùng chat, CTA theo chế độ tham gia / trạng thái chờ */
export function GroupPreview({ group, onClose, onJoin }: Props) {
  const t = useTranslations('chat.preview');
  const approval = group.joinMode === 'approval';
  const pending = group.myStatus === 'pending';
  const cta = pending ? t('pending') : approval ? t('request') : t('join');
  /** NR-R02: nhóm mở tham gia ngay tại đây → cần ô đồng ý (nhóm cần duyệt đồng ý ở form Cộng đồng) */
  const needAgree = !approval && !pending;
  const [agree, setAgree] = useState(false);
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.cover}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh bìa storage động (BUG-011) */}
          <img src={groupCoverSrc(group.coverUrl)} alt="" />
          <span className={styles.region}>
            {t('region', { province: group.province, region: group.region })}
          </span>
          <button type="button" aria-label={t('close')} className={styles.x} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.titleRow}>
            <span className={styles.name}>{group.name}</span>
            <span className={styles.privacy} data-approval={approval}>
              {approval ? t('approval') : t('open')}
            </span>
          </div>
          <span className={styles.desc}>{group.description}</span>
          <div className={styles.stats}>
            <span>
              <b>{fmtNumber(group.memberCount)}</b> {t('members')}
            </span>
            <span>
              <b>{fmtNumber(group.weeklyActive)}</b> {t('weekly')}
            </span>
          </div>
          <div className={styles.note}>{t('note')}</div>
          {needAgree ? (
            <Checkbox
              className={styles.agree ?? ''}
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            >
              {t('agree')}
            </Checkbox>
          ) : null}
          <div className={styles.actions}>
            <button type="button" className={styles.later} onClick={onClose}>
              {t('later')}
            </button>
            <button
              type="button"
              className={styles.join}
              data-pending={pending}
              disabled={pending || (needAgree && !agree)}
              onClick={() => onJoin(group)}
            >
              {cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
