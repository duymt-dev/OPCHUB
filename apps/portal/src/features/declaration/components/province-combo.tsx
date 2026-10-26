'use client';

import { useFieldA11y } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { filterProvinces, provinceRegion } from '../model';
import styles from './declaration.module.css';

const BLUR_MS = 150;

/** "Tỉnh/thành đăng ký kinh doanh *": gõ để lọc hoặc mở danh sách 34 tỉnh (prototype `bp*`) */
export function ProvinceCombo({ value, onValue }: { value: string; onValue: (v: string) => void }) {
  const t = useTranslations('declaration.business');
  const tOpc = useTranslations('declaration.opc');
  const a11y = useFieldA11y();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listId = useId();
  const items = filterProvinces(value);
  const pick = (p: string) => (onValue(p), setOpen(false));

  return (
    <div className={styles.combo}>
      <div className={styles.provBox} data-open={open || undefined}>
        <input
          {...a11y}
          className={styles.searchInput}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          value={value}
          placeholder={t('provincePlaceholder')}
          onChange={(e) => (onValue(e.target.value), setOpen(true))}
          onFocus={() => (clearTimeout(timer.current), setOpen(true))}
          onBlur={() => {
            timer.current = setTimeout(() => setOpen(false), BLUR_MS);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && items[0]) {
              e.preventDefault();
              pick(items[0]);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <span
          className={styles.caret}
          aria-hidden="true"
          onMouseDown={(e) => (e.preventDefault(), setOpen((o) => !o))}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
      {open ? (
        <div id={listId} role="listbox" className={styles.menu}>
          {items.map((p) => (
            <div
              key={p}
              role="option"
              aria-selected={p === value}
              tabIndex={-1}
              className={styles.provOption}
              onMouseDown={(e) => (e.preventDefault(), pick(p))}
            >
              <span>{p}</span>
              <span className={styles.optionSub}>{provinceRegion(p)}</span>
            </div>
          ))}
          {items.length ? null : <div className={styles.none}>{tOpc('none')}</div>}
        </div>
      ) : null}
    </div>
  );
}
