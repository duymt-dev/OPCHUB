'use client';

import { registerGroups } from '@opchub/shared/fixtures';
import { FieldError, type FieldErrorProps, invalidProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { filterOpc, type OpcOption } from '../model';
import styles from './declaration.module.css';

const BLUR_MS = 150;

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  error?: FieldErrorProps | undefined;
}

/** "OPC bạn muốn tham gia *": gõ tên tỉnh/thành → chọn nhiều, chip có × (prototype `regOq`) */
export function OpcPicker({ selected, onChange, error }: Props) {
  const t = useTranslations('declaration.opc');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listId = useId();
  const items = filterOpc(q);
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    setQ('');
    setOpen(false);
  };

  return (
    <div className={styles.block}>
      <div className={styles.head}>
        <span className={styles.label}>
          {t('title')} <span className={styles.req}>*</span>
        </span>
        <span className={styles.count}>{t('count', { count: selected.length })}</span>
      </div>
      <div className={styles.combo}>
        <div className={styles.searchBox} data-open={open || undefined}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          <input
            {...invalidProps(error)}
            className={styles.searchInput}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={t('title')}
            value={q}
            placeholder={t('placeholder')}
            onChange={(e) => (setQ(e.target.value), setOpen(true))}
            onFocus={() => (clearTimeout(timer.current), setOpen(true))}
            onBlur={() => {
              timer.current = setTimeout(() => setOpen(false), BLUR_MS);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          />
        </div>
        {open ? <OpcMenu id={listId} selected={selected} items={items} onToggle={toggle} /> : null}
      </div>
      <PickedChips selected={selected} onChange={onChange} />
      {error ? <FieldError {...error} /> : null}
      <div className={styles.hint}>{t('hint')}</div>
    </div>
  );
}

function OpcMenu({
  id,
  selected,
  items,
  onToggle,
}: {
  id: string;
  selected: string[];
  items: OpcOption[];
  onToggle: (id: string) => void;
}) {
  const t = useTranslations('declaration.opc');
  return (
    <div id={id} role="listbox" aria-label={t('title')} className={styles.menu}>
      {items.map((o) => {
        const on = selected.includes(o.id);
        return (
          <div
            key={o.id}
            role="option"
            aria-selected={on}
            className={styles.option}
            data-on={on || undefined}
            tabIndex={-1}
            onMouseDown={(e) => (e.preventDefault(), onToggle(o.id))}
          >
            <div className={styles.optionText}>
              <span className={styles.optionName}>OPC {o.province}</span>
              <span className={styles.optionSub}>
                {o.region} · {o.members ? t('members', { count: o.members }) : t('active')}
              </span>
            </div>
            <span className={styles.optionTag} data-on={on || undefined}>
              {on ? t('picked') : t('join')}
            </span>
          </div>
        );
      })}
      {items.length ? null : <div className={styles.none}>{t('none')}</div>}
    </div>
  );
}

/** Chip OPC đã chọn, màu theo tone nhóm (prototype `regPicked`) */
function PickedChips({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations('declaration.opc');
  return (
    <div className={styles.picked}>
      {selected.map((id) => {
        const g = registerGroups.find((x) => x.id === id);
        const name = g?.name ?? id;
        return (
          <span
            key={id}
            className={styles.pick}
            style={
              g ? { background: g.tone.bg, borderColor: g.tone.bd, color: g.tone.fg } : undefined
            }
          >
            {name}
            <button
              type="button"
              className={styles.pickRemove}
              aria-label={t('remove', { name })}
              onClick={() => onChange(selected.filter((x) => x !== id))}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}
