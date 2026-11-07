'use client';

import { COVER_DEFAULT_SRC, groupCoverSrc } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import type { EventView } from '../types';
import styles from './event-grid.module.css';
import { ICON, Svg } from './svg';

export interface EventActions {
  onList: (e: EventView) => void;
  onEdit: (e: EventView) => void;
  onShare: (e: EventView) => void;
}

const FILL_CLASS = { open: styles.open, almost: styles.almost, full: styles.full };
const BAR_CLASS = { open: styles.barOpen, almost: styles.barAlmost, full: styles.barFull };

/** BUG-011: ảnh bìa `coverUrl` của item; chưa có / lỗi → ảnh mặc định tự host (D-36) */
export function Cover({ e }: { e: Pick<EventView, 'coverUrl'> }) {
  const onError = (ev: SyntheticEvent<HTMLImageElement>) => {
    const img = ev.currentTarget;
    if (!img.src.endsWith(COVER_DEFAULT_SRC)) img.src = COVER_DEFAULT_SRC;
  };
  // eslint-disable-next-line @next/next/no-img-element -- Dynamic storage cover keeps the D-36 onError fallback.
  return <img className={styles.img} src={groupCoverSrc(e.coverUrl)} alt="" onError={onError} />;
}

export function FillTag({ e }: { e: EventView }) {
  const t = useTranslations('events.status');
  return <span className={`${styles.tag} ${FILL_CLASS[e.fill]}`}>{t(e.fill)}</span>;
}

/** Thanh lấp đầy — độ rộng là dữ liệu động */
export function FillBar({ e }: { e: EventView }) {
  return (
    <div className={styles.track}>
      <div className={`${styles.bar} ${BAR_CLASS[e.fill]}`} style={{ width: `${e.pct}%` }} />
    </div>
  );
}

function Card({ e, a }: { e: EventView; a: EventActions }) {
  const t = useTranslations('events');
  return (
    <article className={styles.card}>
      {/* Prototype `aeCards`: bấm ảnh bìa / tiêu đề mở Chi tiết sự kiện như nút "Danh sách" */}
      <button
        type="button"
        className={styles.cover}
        aria-label={t('card.open', { title: e.title })}
        onClick={() => a.onList(e)}
      >
        <Cover e={e} />
        <span className={styles.statusTag}>
          <FillTag e={e} />
        </span>
        <span className={styles.modeTag}>{t(`mode.${e.mode}`)}</span>
        {e.registrationOpen ? null : <span className={styles.closed}>{t('card.closed')}</span>}
      </button>
      <div className={styles.body}>
        <button type="button" className={styles.title} onClick={() => a.onList(e)}>
          {e.title}
        </button>
        <div className={styles.meta}>
          <span className={styles.metaRow}>
            <Svg d={ICON.day} size={14} stroke="rgba(0,0,0,0.45)" />
            {e.day} · {e.time}
          </span>
          <span className={styles.metaRow}>
            <Svg d={ICON.pin} size={14} stroke="rgba(0,0,0,0.45)" />
            {e.place}
          </span>
        </div>
        <div className={styles.fill}>
          <div className={styles.fillRow}>
            <div className={styles.people}>
              <div className={styles.faces}>
                {e.avatars.slice(0, 3).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- Small attendee avatars use arbitrary storage URLs from the API.
                  <img key={i} className={styles.face} src={src} alt="" />
                ))}
              </div>
              <span className={styles.muted}>{t('card.registered')}</span>
            </div>
            <b className={styles.count}>
              {e.registered}/{e.seats}
            </b>
          </div>
          <FillBar e={e} />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.act} onClick={() => a.onList(e)}>
          {t('card.list')}
        </button>
        <button type="button" className={styles.act} onClick={() => a.onEdit(e)}>
          {t('card.edit')}
        </button>
        <button type="button" className={styles.act} onClick={() => a.onShare(e)}>
          {t('card.share')}
        </button>
      </div>
    </article>
  );
}

/** Lưới thẻ sự kiện + ô "+ Tạo sự kiện mới" (aeGrid) */
export function EventGrid({
  items,
  actions,
  onCreate,
}: {
  items: EventView[];
  actions: EventActions;
  onCreate: () => void;
}) {
  const t = useTranslations('events.card');
  return (
    <div className={styles.grid}>
      {items.map((e) => (
        <Card key={e.id} e={e} a={actions} />
      ))}
      <button type="button" className={styles.tile} onClick={onCreate}>
        <span className={styles.tilePlus}>+</span>
        <span className={styles.tileText}>{t('createTile')}</span>
      </button>
    </div>
  );
}
