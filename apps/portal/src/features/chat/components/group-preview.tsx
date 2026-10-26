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

/** Xem trước nhóm chưa tham gia: phủ lên vùng chat, tham gia ngay (D-71) */
export function GroupPreview({ group, onClose, onJoin }: Props) {
  const t = useTranslations('chat.preview');
  /** NR-R02: tham gia ngay tại đây → cần ô đồng ý nội quy + chính sách phí */
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
            <span className={styles.privacy}>{t('open')}</span>
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
          <Checkbox
            className={styles.agree ?? ''}
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          >
            {t('agree')}
          </Checkbox>
          <div className={styles.actions}>
            <button type="button" className={styles.later} onClick={onClose}>
              {t('later')}
            </button>
            <button
              type="button"
              className={styles.join}
              disabled={!agree}
              onClick={() => onJoin(group)}
            >
              {t('join')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
