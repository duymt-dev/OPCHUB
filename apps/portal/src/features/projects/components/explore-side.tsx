'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { openPricingPopup } from '@/features/membership';
import { AUDIENCES, DEV_STAGES, NEEDS, provinceImage, toggle } from '../explore-model';
import type { ExploreParams } from '../types';
import { Stroke } from './bits';
import styles from './explore-side.module.css';

export interface SideCounts {
  who: Map<string, number>;
  provs: [string, number][];
  devs: Map<string, number>;
  needs: Map<string, number>;
}

interface Props {
  params: ExploreParams;
  counts: SideCounts;
  top: string[];
  onChange: (patch: Partial<ExploreParams>) => void;
  onReset: () => void;
}

function Check({
  on,
  label,
  n,
  onClick,
}: {
  on: boolean;
  label: string;
  n: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      className={styles.opt}
      onClick={onClick}
    >
      <span className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</span>
      <span className={styles.optL}>{label}</span>
      <span className={styles.optN}>({n})</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.section}>
      <button
        type="button"
        aria-expanded={open}
        className={styles.secHead}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.secTitle}>{title}</span>
        <Stroke size={14} width={2}>
          <path
            d="M6 9l6 6 6-6"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transformOrigin: 'center' }}
          />
        </Stroke>
      </button>
      {open ? children : null}
    </div>
  );
}

type Setter = (patch: Partial<ExploreParams>) => void;

/** Thẻ "Bộ lọc": đối tượng (một), địa phương / giai đoạn / nhu cầu (nhiều) */
function Filters({
  params,
  counts,
  set,
}: {
  params: ExploreParams;
  counts: SideCounts;
  set: Setter;
}) {
  const t = useTranslations('projects');
  const [provQ, setProvQ] = useState('');
  const pq = provQ.trim().toLowerCase();
  return (
    <>
      <Section title={t('side.who')}>
        <div className={styles.list}>
          {AUDIENCES.map((w) => (
            <Check
              key={w}
              on={params.who === w}
              label={t(`audience.${w}`)}
              n={counts.who.get(w) ?? 0}
              onClick={() => set({ who: params.who === w ? 'all' : w })}
            />
          ))}
        </div>
      </Section>
      <Section title={t('side.province')}>
        <input
          className={styles.provQ}
          value={provQ}
          placeholder={t('side.provinceSearch')}
          aria-label={t('side.provinceSearch')}
          onChange={(e) => setProvQ(e.target.value)}
        />
        <div className={`${styles.list} ${styles.scroll}`}>
          {counts.provs
            .filter(([p]) => !pq || p.toLowerCase().includes(pq))
            .map(([p, n]) => (
              <Check
                key={p}
                on={params.provs.includes(p)}
                label={p}
                n={n}
                onClick={() => set({ provs: toggle(params.provs, p) })}
              />
            ))}
        </div>
      </Section>
      <Section title={t('side.stage')}>
        <div className={styles.list}>
          {DEV_STAGES.map((s) => (
            <Check
              key={s}
              on={params.devs.includes(s)}
              label={t(`dev.${s}`)}
              n={counts.devs.get(s) ?? 0}
              onClick={() => set({ devs: toggle(params.devs, s) })}
            />
          ))}
        </div>
      </Section>
      <Section title={t('side.needs')}>
        <div className={styles.list}>
          {NEEDS.map((s) => (
            <Check
              key={s}
              on={params.needs.includes(s)}
              label={t(`need.${s}`)}
              n={counts.needs.get(s) ?? 0}
              onClick={() => set({ needs: toggle(params.needs, s) })}
            />
          ))}
        </div>
      </Section>
    </>
  );
}

/** Cột trái: "Bộ lọc", "Địa phương tiêu biểu", "Cần hỗ trợ đăng dự án?" */
export function ExploreSide({ params, counts, top, onChange, onReset }: Props) {
  const t = useTranslations('projects');
  const set: Setter = (patch) => onChange({ ...patch, page: 1 });
  return (
    <aside className={styles.side}>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.headT}>{t('side.title')}</span>
          <button type="button" className={styles.reset} onClick={onReset}>
            {t('side.reset')}
          </button>
        </div>
        <Filters params={params} counts={counts} set={set} />
      </div>
      <div className={styles.topCard}>
        <span className={styles.topT}>{t('side.top')}</span>
        <div className={styles.topGrid}>
          {top.map((p) => (
            <button
              key={p}
              type="button"
              className={styles.topTile}
              style={{ backgroundImage: `url('${provinceImage(p)}')` }}
              onClick={() => set({ provs: [p] })}
            >
              <span className={styles.topShade} />
              <span className={styles.topL}>{p}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.help}>
        <span className={styles.helpT}>{t('side.helpTitle')}</span>
        <span className={styles.helpText}>{t('side.helpText')}</span>
        <button type="button" className={styles.helpBtn} onClick={openPricingPopup}>
          {t('side.helpBtn')}
        </button>
      </div>
    </aside>
  );
}
