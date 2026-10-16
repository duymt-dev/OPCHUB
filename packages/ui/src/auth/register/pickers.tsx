'use client';

import styles from './pickers.module.css';

export interface GroupOption {
  id: string;
  name: string;
  tone: { bg: string; bd: string; fg: string };
}

interface GroupPickerProps {
  title: string;
  countLabel: string;
  hint: string;
  suggestedLabel: string;
  groups: GroupOption[];
  selected: string[];
  suggested: string[];
  onToggle: (id: string) => void;
}

/** Chọn nhóm muốn tham gia; nhóm đã chọn tô màu theo tone của nhóm */
export function GroupPicker(p: GroupPickerProps) {
  return (
    <div className={styles.block}>
      <div className={styles.head}>
        <span className={styles.title}>{p.title}</span>
        <span className={styles.count}>{p.countLabel}</span>
      </div>
      <div className={styles.chips}>
        {p.groups.map((g) => {
          const on = p.selected.includes(g.id);
          const sug = !on && p.suggested.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              className={styles.chip}
              style={
                on ? { background: g.tone.bg, borderColor: g.tone.bd, color: g.tone.fg } : undefined
              }
              onClick={() => p.onToggle(g.id)}
            >
              {on ? '✓ ' : '+ '}
              {g.name}
              {sug ? <span className={styles.sug}>{p.suggestedLabel}</span> : null}
            </button>
          );
        })}
      </div>
      <div className={styles.hint}>{p.hint}</div>
    </div>
  );
}

export interface RoleOption {
  id: string;
  label: string;
  hint: string;
}

/** "Bạn là": lưới thẻ vai trò (form cá nhân) */
export function RolePicker({
  title,
  roles,
  value,
  onChange,
}: {
  title: string;
  roles: RoleOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className={styles.block}>
      <div className={styles.title}>{title}</div>
      <div className={styles.roles} role="radiogroup" aria-label={title}>
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={r.id === value}
            className={styles.role}
            onClick={() => onChange(r.id)}
          >
            <span className={styles.roleLabel}>{r.label}</span>
            <span className={styles.roleHint}>{r.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
