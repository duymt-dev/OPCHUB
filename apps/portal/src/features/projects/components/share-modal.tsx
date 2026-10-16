'use client';

import { initials, tones, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useShareProject } from '../hooks/use-project-actions';
import { useJoinedGroups } from '../hooks/use-projects';
import base from './form.module.css';
import styles from './dialogs.module.css';
import { Dialog } from './overlay';

/** Đường dẫn công khai của dự án (prototype: community.opchub.vn/du-an/:id) */
export const shareLinkOf = (id: string) => `https://community.opchub.vn/du-an/${id}`;

const TONE_ORDER = ['blue', 'rose', 'green', 'amber', 'violet'] as const;

/** "Gửi vào phòng chat nhóm": nhóm người dùng đã tham gia */
function GroupChecklist({
  picked,
  onToggle,
}: {
  picked: string[];
  onToggle: (id: string) => void;
}) {
  const groups = useJoinedGroups();
  return (
    <div className={styles.groupList}>
      {(groups.data ?? []).map((g) => {
        const on = picked.includes(g.id);
        const tone = tones[TONE_ORDER[g.order % TONE_ORDER.length] ?? 'blue'];
        return (
          <button
            key={g.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            className={styles.groupRow}
            onClick={() => onToggle(g.id)}
          >
            <span className={`${styles.check} ${on ? styles.checkOn : ''}`}>{on ? '✓' : ''}</span>
            <span className={styles.groupMono} style={{ background: tone.bg, color: tone.fg }}>
              {initials(g.name)}
            </span>
            <span className={styles.groupName}>{g.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function ShareBody({
  project,
  onClose,
}: {
  project: { id: string; name: string };
  onClose: () => void;
}) {
  const t = useTranslations('projects.share');
  const toast = useToast();
  const share = useShareProject();
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState(t('defaultMessage'));
  const link = shareLinkOf(project.id);

  const copy = () => {
    void navigator.clipboard?.writeText(link).catch(() => undefined);
    toast(t('copied'));
  };
  const submit = () => {
    if (!picked.length) return toast(t('needGroup'));
    share.mutate(
      { id: project.id, groupIds: picked, message },
      {
        onSuccess: (r) => {
          toast(t('done', { name: project.name, n: r.groupCount }));
          onClose();
        },
      },
    );
  };
  const toggle = (id: string) =>
    setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Dialog
      open
      width={480}
      title={t('title', { name: project.name })}
      closeLabel={t('close')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={base.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={`${base.btn} ${base.btnPrimary}`} onClick={submit}>
            {t('submit')}
          </button>
        </>
      }
    >
      <div className={styles.shareGrid}>
        <div className={styles.linkRow}>
          <input
            className={`${base.input} ${base.readonly}`}
            readOnly
            value={link}
            aria-label={link}
          />
          <button type="button" className={`${base.btn} ${styles.btn36}`} onClick={copy}>
            {t('copy')}
          </button>
        </div>
        <div className={styles.label500}>{t('groups')}</div>
        <GroupChecklist picked={picked} onToggle={toggle} />
        <label className={base.field}>
          {t('message')}
          <textarea
            rows={2}
            className={`${base.textarea} ${base.textareaPlain}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
      </div>
    </Dialog>
  );
}

/** P-78: Chia sẻ dự án — sao chép link, gửi vào phòng Chung các nhóm đã tham gia */
export function ShareModal({
  project,
  onClose,
}: {
  project: { id: string; name: string } | null;
  onClose: () => void;
}) {
  if (!project) return null;
  return <ShareBody key={project.id} project={project} onClose={onClose} />;
}
