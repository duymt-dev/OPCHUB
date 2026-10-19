'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useEscape } from '../hooks/use-escape';
import type { GroupLookup } from '../types';
import { AssignGroupList } from './assign-group-list';
import styles from './assign-modal.module.css';

const SHOWN_NAMES = 6;
type GroupRole = 'member' | 'lecturer';

interface Props {
  targets: AdminMember[];
  groups: GroupLookup;
  onClose: () => void;
  onSave: (groupIds: string[], role: GroupRole) => Promise<unknown>;
}

function useAssignState(onSave: Props['onSave'], onClose: () => void) {
  const toast = useToast();
  const tToast = useTranslations('members.toast');
  const [q, setQ] = useState('');
  const [role, setRole] = useState<GroupRole>('member');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const save = () => {
    if (picked.size === 0) return toast(tToast('pickGroup'));
    void onSave([...picked], role).then(onClose, () => undefined);
  };
  return { q, setQ, role, setRole, picked, toggle, save };
}

/**
 * D-12 "Gán N thành viên vào nhóm" / "Gán {name} vào nhóm". Hộp tự vẽ role=dialog
 * (không motion antd — parity dừng đồng hồ).
 */
export function AssignModal({ targets, groups, onClose, onSave }: Props) {
  const t = useTranslations('members.assign');
  const tRole = useTranslations('members.role');
  const s = useAssignState(onSave, onClose);
  useEscape(true, onClose);

  const term = s.q.trim().toLowerCase();
  const list = groups.list.filter(
    (g) => !term || `${g.name} ${g.province}`.toLowerCase().includes(term),
  );
  const first = targets[0];
  const title =
    targets.length === 1 && first
      ? t('titleOne', { name: first.fullName })
      : t('titleMany', { n: targets.length });

  return (
    <div className={styles.mask}>
      <button type="button" aria-label={t('close')} className={styles.backdrop} onClick={onClose} />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="ga-title">
        <div className={styles.head}>
          <span id="ga-title" className={styles.title}>
            {title}
          </span>
          <button type="button" aria-label={t('close')} className={styles.x} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.names}>
            {targets.slice(0, SHOWN_NAMES).map((m) => (
              <span key={m.id} className={styles.nameTag}>
                {m.fullName}
              </span>
            ))}
            <span className={styles.moreNames}>
              {targets.length > SHOWN_NAMES ? `+${targets.length - SHOWN_NAMES}` : ''}
            </span>
          </div>
          <div className={styles.filters}>
            <input
              className={styles.input}
              value={s.q}
              placeholder={t('search')}
              aria-label={t('search')}
              onChange={(e) => s.setQ(e.target.value)}
            />
            <select
              className={styles.select}
              aria-label={t('groupRole')}
              value={s.role}
              onChange={(e) => s.setRole(e.target.value === 'lecturer' ? 'lecturer' : 'member')}
            >
              <option value="member">{tRole('member')}</option>
              <option value="lecturer">{tRole('lecturer')}</option>
            </select>
          </div>
          <AssignGroupList groups={list} targets={targets} picked={s.picked} onToggle={s.toggle} />
        </div>
        <div className={styles.foot}>
          <span className={styles.info}>
            {s.picked.size ? t('count', { n: s.picked.size }) : t('none')}
          </span>
          <button type="button" className={styles.cancel} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={styles.save} onClick={s.save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
