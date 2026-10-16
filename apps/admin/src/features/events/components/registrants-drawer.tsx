'use client';

import { colorOf, initials } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCheckIn, useExportRegistrants, useRegistrants } from '../hooks/use-events';
import { daysAgo } from '../model';
import type { EventView } from '../types';
import styles from './registrants.module.css';
import { Sheet } from './sheet';

interface Props {
  event: EventView | null;
  onClose: () => void;
}

function Body({ event }: { event: EventView }) {
  const t = useTranslations('events.regs');
  const list = useRegistrants(event.id);
  const check = useCheckIn(event.id);
  const rows = list.data ?? [];
  const done = rows.filter((r) => r.status === 'attended').length;
  const [now] = useState(() => Date.now());
  const pending = rows.filter((r) => r.status !== 'attended').map((r) => r.userId);

  return (
    <>
      <div className={styles.summary}>
        <div className={styles.evTitle}>{event.title}</div>
        <div className={styles.evMeta}>
          {event.day} · {event.time} · {event.place}
        </div>
        <div className={styles.tags}>
          <span className={styles.seats}>
            {t('seats', { reg: event.registered, seats: event.seats })}
          </span>
          <span className={styles.checked}>{t('checked', { n: done, total: rows.length })}</span>
          <button
            type="button"
            className={styles.checkAll}
            disabled={!pending.length || check.isPending}
            onClick={() => check.mutate({ userIds: pending, attended: true })}
          >
            {t('checkAll')}
          </button>
        </div>
      </div>
      <div className={styles.list}>
        {list.isLoading ? <div className={styles.note}>{t('loading')}</div> : null}
        {list.data && !rows.length ? <div className={styles.note}>{t('none')}</div> : null}
        {rows.map((r) => {
          const on = r.status === 'attended';
          const n = daysAgo(r.registeredAt, now);
          return (
            <div key={r.userId} className={styles.row}>
              {/* Màu nền avatar là dữ liệu động (theo tên) */}
              <span className={styles.av} style={{ background: colorOf(r.fullName) }}>
                {initials(r.fullName)}
              </span>
              <div className={styles.who}>
                <span className={styles.name}>{r.fullName}</span>
                <span className={styles.org}>{r.org}</span>
              </div>
              <span className={styles.when}>{n ? t('daysAgo', { n }) : t('today')}</span>
              <button
                type="button"
                className={`${styles.ck} ${on ? styles.ckOn : ''}`}
                aria-pressed={on}
                disabled={check.isPending}
                onClick={() => check.mutate({ userIds: [r.userId], attended: !on })}
              >
                {on ? t('checkedIn') : t('checkIn')}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ExportButton({ id }: { id: string }) {
  const t = useTranslations('events.regs');
  const exp = useExportRegistrants(id);
  return (
    <button
      type="button"
      className={styles.export}
      disabled={exp.isPending}
      onClick={() => exp.mutate()}
    >
      {t('export')}
    </button>
  );
}

/** D-46: drawer "Danh sách đăng ký" — xuất CSV (audit), check-in từng người / tất cả */
export function RegistrantsDrawer({ event, onClose }: Props) {
  const t = useTranslations('events');
  return (
    <Sheet
      open={!!event}
      width="narrow"
      title={t('regs.title')}
      closeLabel={t('form.close')}
      onClose={onClose}
      extra={event ? <ExportButton id={event.id} /> : null}
    >
      {event ? <Body key={event.id} event={event} /> : null}
    </Sheet>
  );
}
