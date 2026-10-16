import side from './sidebar.module.css';

export interface SidebarEventCardProps {
  title: string;
  body: string;
  linkLabel: string;
  onOpen?: () => void;
}

/** Thẻ "Sự kiện gần nhất" ở chân sidebar */
export function SidebarEventCard({ title, body, linkLabel, onOpen }: SidebarEventCardProps) {
  return (
    <div className={side.eventCard}>
      <div className={side.eventTitle}>{title}</div>
      <div className={side.eventBody}>{body}</div>
      <button type="button" className={side.eventLink} onClick={onOpen}>
        {linkLabel}
      </button>
    </div>
  );
}
