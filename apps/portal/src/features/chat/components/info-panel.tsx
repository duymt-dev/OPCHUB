'use client';

import type { JoinRequest, RoomFile, RoomMember, RoomPin } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { PANEL_TABS, type PanelTab } from '../types';
import styles from './info-panel.module.css';
import { PanelMembers } from './panel-members';

interface Props {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  isOwner: boolean;
  requests: JoinRequest[];
  onDecide: (r: JoinRequest, ok: boolean) => void;
  members: RoomMember[];
  total: number;
  files: RoomFile[];
  pins: RoomPin[];
  canUnpin: boolean;
  onUnpin: (id: string) => void;
}

/** Bảng phải: Thành viên (+ duyệt yêu cầu) / File / Đã ghim — URL `?panel=` */
export function InfoPanel(p: Props) {
  const t = useTranslations('chat.panel');
  const label = (k: PanelTab) =>
    k === 'members' ? t('members') : k === 'files' ? t('files') : t('pins', { n: p.pins.length });
  return (
    <aside className={styles.panel} data-m="rt" aria-label={t('members')}>
      <div className={styles.tabs} role="tablist">
        <button type="button" aria-label={t('close')} className={styles.x} onClick={p.onClose}>
          ✕
        </button>
        {PANEL_TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={p.tab === k}
            className={styles.tab}
            onClick={() => p.onTab(k)}
          >
            {label(k)}
          </button>
        ))}
      </div>
      <div className={styles.body} role="tabpanel">
        {p.tab === 'members' ? (
          <PanelMembers
            isOwner={p.isOwner}
            requests={p.requests}
            onDecide={p.onDecide}
            members={p.members}
            total={p.total}
          />
        ) : null}
        {p.tab === 'files' ? <FilesTab files={p.files} /> : null}
        {p.tab === 'pins' ? (
          <PinsTab pins={p.pins} canUnpin={p.canUnpin} onUnpin={p.onUnpin} />
        ) : null}
      </div>
    </aside>
  );
}

function FilesTab({ files }: { files: RoomFile[] }) {
  const t = useTranslations('chat.panel');
  if (!files.length) return <div className={styles.empty}>{t('noFiles')}</div>;
  return files.map((f) => (
    <div key={f.messageId} className={styles.file}>
      <span className={styles.fileExt}>{f.ext}</span>
      <div className={styles.col}>
        {f.url ? (
          <a className={styles.fileName} href={f.url} download={f.name} rel="noopener noreferrer">
            {f.name}
          </a>
        ) : (
          <span className={styles.fileName}>{f.name}</span>
        )}
        <span className={styles.small}>{f.size}</span>
      </div>
    </div>
  ));
}

function PinsTab({
  pins,
  canUnpin,
  onUnpin,
}: {
  pins: RoomPin[];
  canUnpin: boolean;
  onUnpin: (id: string) => void;
}) {
  const t = useTranslations('chat');
  if (!pins.length) return <div className={styles.empty}>{t('panel.noPins')}</div>;
  return pins.map((p) => (
    <div key={p.messageId} className={styles.pin}>
      <b className={styles.pinWho}>{p.senderName}</b>
      <span className={styles.pinText}>{p.text}</span>
      {canUnpin ? (
        <button type="button" className={styles.unpin} onClick={() => onUnpin(p.messageId)}>
          {t('pin.unpin')}
        </button>
      ) : null}
    </div>
  ));
}
