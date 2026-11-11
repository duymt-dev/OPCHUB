'use client';

import { useTranslations } from 'next-intl';
import type { useExportState } from '../hooks/use-export';
import { EXPORT_FIELDS, type AdminGroup, type ExportStatus } from '../types';
import styles from './export-modal.module.css';
import { useNumberText } from '@/i18n/use-number-text';

type ExportState = ReturnType<typeof useExportState>;

const isStatus = (v: string): v is ExportStatus => ['all', 'active', 'locked'].includes(v);

interface GroupPickProps {
  s: ExportState;
  ordered: AdminGroup[];
  counts: Record<string, number>;
}

/** Danh sách chọn nhóm (pill) + Chọn / Bỏ chọn tất cả */
export function GroupPick({ s, ordered, counts }: GroupPickProps) {
  const numberText = useNumberText();
  const t = useTranslations('groups.export');
  const allOn = ordered.every((g) => s.sel.includes(g.id));
  const toggle = (id: string) =>
    s.setSel(s.sel.includes(id) ? s.sel.filter((x) => x !== id) : [...s.sel, id]);
  return (
    <div className={styles.section}>
      <div className={styles.row}>
        <span className={styles.label}>{t('groups')}</span>
        <button
          type="button"
          className={styles.link}
          onClick={() => s.setSel(allOn ? [] : ordered.map((g) => g.id))}
        >
          {allOn ? t('deselectAll') : t('selectAll')}
        </button>
      </div>
      <div className={styles.pills}>
        {ordered.map((g) => {
          const on = s.sel.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              className={`${styles.pill} ${on ? styles.pillOn : ''}`}
              onClick={() => toggle(g.id)}
            >
              {on ? '✓ ' : ''}
              {g.name} <span className={styles.dim}>{numberText(counts[g.id] ?? 0)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FieldPick({ s }: { s: ExportState }) {
  const t = useTranslations('groups.export');
  return (
    <div className={styles.section}>
      <span className={styles.label}>{t('fields')}</span>
      <div className={styles.fields}>
        {EXPORT_FIELDS.map((f) => {
          const on = s.fields.includes(f);
          return (
            <button
              key={f}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={styles.field}
              onClick={() => s.toggleField(f)}
            >
              <span className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</span>
              {t(`field.${f}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatusFormat({ s }: { s: ExportState }) {
  const t = useTranslations('groups.export');
  return (
    <div className={styles.two}>
      <label className={styles.col}>
        {t('status')}
        <select
          className={styles.select}
          value={s.status}
          onChange={(e) => isStatus(e.target.value) && s.setStatus(e.target.value)}
        >
          <option value="all">{t('statusAll')}</option>
          <option value="active">{t('statusActive')}</option>
          <option value="locked">{t('statusLocked')}</option>
        </select>
      </label>
      <div className={styles.col}>
        {t('format')}
        <div className={styles.seg} role="radiogroup" aria-label={t('format')}>
          {(['csv', 'xls'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={s.format === k}
              className={`${styles.segItem} ${s.format === k ? styles.segOn : ''}`}
              onClick={() => s.setFormat(k)}
            >
              {t(k)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Preview({ s }: { s: ExportState }) {
  const numberText = useNumberText();
  const t = useTranslations('groups.export');
  return (
    <div className={styles.section}>
      <div className={styles.row}>
        <span className={styles.label}>{t('preview')}</span>
        <span className={styles.info}>
          {t(s.more ? 'infoMore' : 'info', {
            rows: numberText(s.rows),
            groups: numberText(s.sel.length),
          })}
        </span>
      </div>
      <div className={styles.tableBox}>
        <table className={styles.table}>
          <thead>
            <tr>
              {s.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.preview.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
