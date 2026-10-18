'use client';

import { IMAGE_ACCEPT } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import type { MemberSuggestion } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { suggestMembers } from '../api';
import type { PickImage } from '../hooks/use-project-images';
import { useJoinedGroups } from '../hooks/use-projects';
import type { FormSet, ProjectFormState, TeamRow } from '../types';
import { Face } from './bits';
import { CardRadio } from './form-repo-fund';
import base from './form.module.css';
import styles from './form-team.module.css';

interface Props {
  f: ProjectFormState;
  set: FormSet;
}

function TeamAvatar({ m, onPick }: { m: TeamRow; onPick: (file: File) => void }) {
  const t = useTranslations('projects.form');
  return (
    <label title={t('teamAvatar')} className={styles.teamAv}>
      {m.avatarUrl || m.isOwner ? (
        <Face name={m.name} src={m.avatarUrl} size={40} />
      ) : (
        <span className={styles.avEmpty}>+</span>
      )}
      <span className={styles.avPlus}>+</span>
      <input
        type="file"
        accept={IMAGE_ACCEPT}
        className={base.hidden}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPick(file);
        }}
      />
    </label>
  );
}

function TeamRowItem({
  m,
  onPatch,
  onRemove,
  onPhoto,
}: {
  m: TeamRow;
  onPatch: (p: Partial<TeamRow>) => void;
  onRemove: () => void;
  onPhoto: (file: File) => void;
}) {
  const t = useTranslations('projects.form');
  return (
    <div className={styles.teamRow}>
      <TeamAvatar m={m} onPick={onPhoto} />
      <input
        className={`${styles.input32} ${m.isOwner ? styles.ownerInput : ''}`}
        value={m.name}
        readOnly={m.isOwner}
        placeholder={t('teamName')}
        aria-label={t('teamName')}
        onChange={(e) => onPatch({ name: e.target.value })}
      />
      <input
        className={styles.input32}
        value={m.role}
        placeholder={t('teamRole')}
        aria-label={t('teamRole')}
        onChange={(e) => onPatch({ role: e.target.value })}
      />
      {m.isOwner ? (
        <span className={styles.ownerMark}>{t('teamOwner')}</span>
      ) : (
        <button type="button" title={t('teamRemove')} className={styles.remove} onClick={onRemove}>
          ✕
        </button>
      )}
    </div>
  );
}

function Suggestions({
  options,
  onPick,
}: {
  options: MemberSuggestion[];
  onPick: (row: TeamRow) => void;
}) {
  if (!options.length) return null;
  return (
    <div className={styles.sugBox} role="listbox">
      {options.map((u) => (
        <button
          key={u.name}
          type="button"
          role="option"
          aria-selected={false}
          className={styles.sug}
          onClick={() => onPick({ name: u.name, role: '', avatarUrl: u.avatarUrl, isOwner: false })}
        >
          <Face name={u.name} src={u.avatarUrl} size={28} />
          <span className={styles.sugName}>{u.name}</span>
          <span className={base.count}>{u.subtitle}</span>
        </button>
      ))}
    </div>
  );
}

/** Đội ngũ dự án: dòng thành viên (ảnh, tên, vai trò), tìm thành viên OPC Hub, thêm tự do */
interface TeamProps extends Props {
  pickImage: PickImage;
  /** Ghi ảnh dòng `i` trên state mới nhất (ảnh tải xong bất đồng bộ) */
  setAvatar: (i: number, url: string | null) => void;
}

export function TeamSection({ f, set, pickImage, setAvatar }: TeamProps) {
  const t = useTranslations('projects.form');
  const [q, setQ] = useState('');
  const term = q.trim();
  const sug = useQuery({
    queryKey: ['members', 'suggest', term],
    queryFn: () => suggestMembers(term),
    enabled: term.length > 0,
  });
  const options = (sug.data ?? []).filter((u) => !f.team.some((m) => m.name === u.name));
  const patch = (i: number, p: Partial<TeamRow>) =>
    set(
      'team',
      f.team.map((m, j) => (j === i ? { ...m, ...p } : m)),
    );
  const add = (row: TeamRow) => {
    set('team', [...f.team, row]);
    setQ('');
  };
  return (
    <div className={base.field}>
      <div className={base.labelRow}>
        <span>{t('team')}</span>
        <span className={base.count}>{t('teamCount', { n: f.team.length })}</span>
      </div>
      <div className={styles.teamRows}>
        {f.team.map((m, i) => (
          <TeamRowItem
            key={i}
            m={m}
            onPatch={(p) => patch(i, p)}
            onPhoto={(file) => pickImage(file, m.avatarUrl, (url) => setAvatar(i, url))}
            onRemove={() =>
              set(
                'team',
                f.team.filter((_, j) => j !== i),
              )
            }
          />
        ))}
      </div>
      <div className={styles.teamAdd}>
        <input
          className={styles.input32}
          value={q}
          placeholder={t('teamSearch')}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => add({ name: term, role: '', avatarUrl: null, isOwner: false })}
        >
          {t('teamAdd')}
        </button>
        <Suggestions options={options} onPick={add} />
      </div>
      <span className={base.hint}>{t('teamHint')}</span>
    </div>
  );
}

/** Quyền hiển thị (BR-08) + chia sẻ tới nhóm đã tham gia */
export function AudienceSection({ f, set }: Props) {
  const t = useTranslations('projects.form');
  const groups = useJoinedGroups();
  const toggle = (id: string) =>
    set(
      'groupIds',
      f.groupIds.includes(id) ? f.groupIds.filter((g) => g !== id) : [...f.groupIds, id],
    );
  return (
    <>
      <div className={base.field}>
        {t('visibility')}
        <CardRadio
          value={f.visibility}
          onChange={(v) => set('visibility', v)}
          options={[
            { key: 'public', label: t('public'), sub: t('publicSub') },
            { key: 'private', label: t('private'), sub: t('privateSub') },
          ]}
        />
      </div>
      <div className={base.field}>
        {t('groups')}
        <div className={styles.groupChips}>
          {(groups.data ?? []).map((g) => {
            const on = f.groupIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                className={`${styles.groupChip} ${on ? styles.groupChipOn : ''}`}
                onClick={() => toggle(g.id)}
              >
                {on ? '✓ ' : '+ '}
                {g.name}
              </button>
            );
          })}
        </div>
        <span className={base.hint}>{t('groupsHint')}</span>
      </div>
    </>
  );
}
