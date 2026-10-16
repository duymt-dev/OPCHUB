'use client';

import { useTranslations } from 'next-intl';
import type { EventView } from '../types';
import { Cover, FillBar, FillTag, type EventActions } from './event-grid';
import styles from './event-table.module.css';

/** Bảng sự kiện (aeList); ở màn hẹp mỗi dòng thành thẻ như prototype (data-m="tbl") */
export function EventTable({ items, actions }: { items: EventView[]; actions: EventActions }) {
  const t = useTranslations('events');
  return (
    <div className={styles.wrap}>
      <div className={styles.inner} role="table" aria-label={t('table.label')}>
        <div className={`${styles.row} ${styles.head}`} role="row">
          <span role="columnheader" />
          <span role="columnheader">{t('table.event')}</span>
          <span role="columnheader">{t('table.time')}</span>
          <span role="columnheader">{t('table.place')}</span>
          <span role="columnheader">{t('table.mode')}</span>
          <span role="columnheader">{t('table.reg')}</span>
          <span role="columnheader">{t('table.status')}</span>
          <span role="columnheader" />
        </div>
        {items.map((e) => (
          <div key={e.id} className={`${styles.row} ${styles.item}`} role="row">
            <div className={styles.thumb} role="cell">
              <Cover e={e} />
            </div>
            <b className={styles.name} role="cell">
              {e.title}
            </b>
            <span className={styles.muted} role="cell">
              {e.day} · {e.time}
            </span>
            <span className={styles.muted} role="cell">
              {e.place}
            </span>
            <span className={styles.muted} role="cell">
              {t(`mode.${e.mode}`)}
            </span>
            <div className={styles.reg} role="cell">
              <div className={styles.regBar}>
                <FillBar e={e} />
              </div>
              <span className={styles.regText}>
                {e.registered}/{e.seats}
              </span>
            </div>
            <span className={styles.status} role="cell">
              <FillTag e={e} />
            </span>
            <div className={styles.links} role="cell">
              <button type="button" className={styles.link} onClick={() => actions.onList(e)}>
                {t('card.list')}
              </button>
              <button type="button" className={styles.link} onClick={() => actions.onEdit(e)}>
                {t('card.editShort')}
              </button>
              <button type="button" className={styles.link} onClick={() => actions.onShare(e)}>
                {t('card.share')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
