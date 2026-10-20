import side from './sidebar.module.css';

export interface SidebarEventItem {
  id: string;
  /** Thứ viết tắt: T5, CN */
  dow: string;
  /** Ngày trong tháng: 22 */
  dnum: string;
  title: string;
  /** "T5, 22/10 · 19:30 · Offline" */
  meta: string;
}

export interface SidebarEventsProps {
  title: string;
  allLabel: string;
  items: readonly SidebarEventItem[];
  onAll: () => void;
  onOpen: (id: string) => void;
}

/** Ver2 — khối "Sự kiện sắp tới" ở chân sidebar: tối đa 3 sự kiện + "Xem tất cả" */
export function SidebarEvents({ title, allLabel, items, onAll, onOpen }: SidebarEventsProps) {
  return (
    <section className={side.events} aria-label={title}>
      <div className={side.eventsHead}>
        <span className={side.eventsTitle}>{title}</span>
        <button type="button" className={side.eventsAll} onClick={onAll}>
          {allLabel}
        </button>
      </div>
      {items.slice(0, 3).map((e) => (
        <button key={e.id} type="button" className={side.eventRow} onClick={() => onOpen(e.id)}>
          <span className={side.cal} aria-hidden="true">
            <span className={side.calDow}>{e.dow}</span>
            <span className={side.calNum}>{e.dnum}</span>
          </span>
          <span className={side.eventText}>
            <span className={side.eventName}>{e.title}</span>
            <span className={side.eventMeta}>{e.meta}</span>
          </span>
        </button>
      ))}
    </section>
  );
}

/** "T5, 22/10" + giờ + hình thức → dòng sidebar (thuần, để unit test) */
export function toSidebarEvent(e: {
  id: string;
  title: string;
  day: string;
  time: string;
  mode: 'online' | 'offline';
}): SidebarEventItem {
  const [dow = '', date = ''] = e.day.split(',').map((x) => x.trim());
  return {
    id: e.id,
    dow,
    dnum: date.split('/')[0] ?? '',
    title: e.title,
    meta: `${e.day} · ${e.time} · ${e.mode === 'online' ? 'Online' : 'Offline'}`,
  };
}
