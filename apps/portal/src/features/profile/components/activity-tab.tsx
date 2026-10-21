'use client';

import { tones, type ToneName } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useActivity, useLeaveGroup } from '../hooks/use-activity';
import styles from './activity.module.css';
import { Tag } from './tag';
import { fmtInt } from '@/i18n/format';

const TONE_ORDER: ToneName[] = ['blue', 'rose', 'green', 'amber', 'violet'];
const toneAt = (order: number) => tones[TONE_ORDER[order % TONE_ORDER.length] ?? 'blue'];
const fmt = fmtInt;

/** P-92: tab "Nhóm & hoạt động" — nhóm (rời / huỷ yêu cầu) + sự kiện đã đăng ký */
export function ActivityTab() {
  const t = useTranslations('profile.activity');
  const router = useRouter();
  const { groups, events } = useActivity();
  const leave = useLeaveGroup();
  const gList = groups.data ?? [];
  const eList = events.data ?? [];

  return (
    <>
      <div className={styles.section}>
        <span className={styles.title}>{t('groups')}</span>
        {gList.map((g) => {
          const tone = toneAt(g.order);
          return (
            <div key={g.id} className={styles.row}>
              {/* Màu ô chữ viết tắt là dữ liệu tông nhóm (động) */}
              <span className={styles.mono} style={{ background: tone.bg, color: tone.fg }}>
                {g.mono}
              </span>
              <div className={styles.text}>
                <span className={styles.name}>{g.name}</span>
                <span className={styles.sub}>
                  {t('groupSub', { members: fmt(g.members), region: g.region })}
                </span>
              </div>
              <Tag tone={g.pending ? 'amber' : 'green'}>
                {g.pending ? t('pendingTag') : t('memberTag')}
              </Tag>
              <button
                type="button"
                className={`${styles.action} ${g.pending ? '' : styles.danger}`}
                onClick={() => leave(g)}
              >
                {g.pending ? t('cancel') : t('leave')}
              </button>
            </div>
          );
        })}
        {groups.data && !gList.length ? (
          <span className={styles.empty}>{t('noGroups')}</span>
        ) : null}
      </div>
      <div className={styles.section}>
        <span className={styles.title}>{t('events')}</span>
        {eList.map((e) => (
          <button
            key={e.id}
            type="button"
            className={styles.row}
            onClick={() => router.push(`/events/${encodeURIComponent(e.id)}`)}
          >
            <span className={styles.date}>
              <span>{e.dow}</span>
              <b>{e.dnum}</b>
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{e.title}</span>
              <span className={styles.sub}>{`${e.time} · ${e.place}`}</span>
            </span>
            <Tag tone="blue">{t('registered')}</Tag>
          </button>
        ))}
        {events.data && !eList.length ? (
          <span className={styles.empty}>{t('noEvents')}</span>
        ) : null}
      </div>
    </>
  );
}
