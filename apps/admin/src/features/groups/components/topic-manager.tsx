'use client';

import type { AdminRoom } from '@opchub/shared/api-domains';
import { ConfirmDialog } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type TopicCallbacks, useGroupTopics } from '../hooks/use-group-topics';
import form from './group-form.module.css';
import { Dialog } from './overlay';
import btn from './overlay.module.css';
import styles from './topic-manager.module.css';

interface Props {
  groupId: string;
  rooms: AdminRoom[];
  open: boolean;
  onClose: () => void;
  sync: TopicCallbacks;
}

/** Nút "Quản lý chủ đề" cạnh bộ đếm phòng + hộp quản lý (chỉ form sửa nhóm) */
export function ManageTopics(p: Omit<Props, 'open' | 'onClose'>) {
  const t = useTranslations('groups.form');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={form.manage} onClick={() => setOpen(true)}>
        {t('topics')}
      </button>
      <TopicManager {...p} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * D-111 "Quản lý chủ đề": đổi tên + mô tả, xoá mềm chủ đề có sẵn của nhóm. "# Chung" chỉ đổi mô tả, không xoá.
 * Prototype v4.2 không có control này (Q-V42-709-1) → hộp tối thiểu mở từ khối "Chủ đề thảo luận".
 */
export function TopicManager({ groupId, rooms, open, onClose, sync }: Props) {
  const t = useTranslations('groups.form');
  const topics = useGroupTopics(groupId, sync);
  return (
    <>
      <Dialog
        open={open && !topics.confirm}
        title={t('topicsTitle')}
        closeLabel={t('close')}
        onClose={onClose}
        footer={
          <button type="button" className={btn.btn} onClick={onClose}>
            {t('topicClose')}
          </button>
        }
      >
        <p className={styles.hint}>{t('topicsHint')}</p>
        <div className={styles.list}>
          {rooms.map((r) => (
            <TopicRow
              key={`${r.id}:${r.name}:${r.description}`}
              room={r}
              busy={topics.busy}
              onSave={(body) => topics.rename(r, body)}
              onDelete={() => topics.remove(r)}
            />
          ))}
        </div>
      </Dialog>
      <ConfirmDialog req={topics.confirm} busy={topics.busy} onClose={topics.closeConfirm} />
    </>
  );
}

interface RowProps {
  room: AdminRoom;
  busy: boolean;
  onSave: (body: { name: string; description: string }) => void;
  onDelete: () => void;
}

function TopicRow({ room, busy, onSave, onDelete }: RowProps) {
  const t = useTranslations('groups.form');
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description);
  const dirty = name.trim() !== room.name || description.trim() !== room.description;
  return (
    <div className={styles.row} data-testid="topic-row">
      <div className={styles.name} data-locked={room.isDefault}>
        <span className={styles.hash}>#</span>
        <input
          className={styles.bare}
          value={name}
          readOnly={room.isDefault}
          maxLength={60}
          aria-label={t('topicName')}
          onChange={(e) => setName(e.target.value.replace(/^#\s*/, ''))}
        />
      </div>
      <input
        className={styles.input}
        value={description}
        maxLength={120}
        aria-label={t('topicDesc')}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        type="button"
        className={styles.act}
        disabled={busy || !dirty || !name.trim()}
        onClick={() => onSave({ name: name.trim(), description: description.trim() })}
      >
        {t('topicSave')}
      </button>
      {room.isDefault ? (
        <span className={styles.tag}>{t('topicLocked')}</span>
      ) : (
        <button
          type="button"
          className={`${styles.act} ${styles.del}`}
          disabled={busy}
          onClick={onDelete}
        >
          {t('topicDelete')}
        </button>
      )}
    </div>
  );
}
