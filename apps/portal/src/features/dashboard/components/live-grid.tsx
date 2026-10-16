'use client';

import type { LiveMember } from '@opchub/shared/api-domains';
import { Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAgo } from '../hooks/use-ago';
import { activePct, countByStatus, filterMembers, latestActivity, pageSlice } from '../model';
import { FILTER_COLORS, LIVE_FILTERS, LIVE_PAGE_SIZES, type DashboardParams } from '../types';
import card from './dashboard.module.css';
import styles from './live-grid.module.css';
import { LiveTile } from './live-tile';

interface Props {
  members: LiveMember[];
  now: number;
  selectedId: string;
  params: DashboardParams;
  onParams: (p: Partial<DashboardParams>) => void;
  onPick: (id: string) => void;
}

/** P-01/P-02/P-04: "Danh sách thành viên tham gia hoạt động" — chú thích lọc + lưới + phân trang */
export function LiveGrid({ members, now, selectedId, params, onParams, onPick }: Props) {
  const t = useTranslations('dashboard.live');
  const ago = useAgo(now);
  const counts = countByStatus(members);
  const rows = filterMembers(members, params.live);
  const { page, rows: visible } = pageSlice(rows, params.page, params.size);
  const pct = activePct(members);

  return (
    <section className={card.card}>
      <div className={styles.head}>
        <div className={styles.titleWrap}>
          <span className={styles.title}>{t('title')}</span>
          <span className={styles.badge}>
            <i className={styles.blink} />
            {t('badge')}
          </span>
          <span className={styles.updated}>
            {t('updated', { ago: ago.live(latestActivity(members)) })}
          </span>
        </div>
        <div className={styles.legend} role="radiogroup" aria-label={t('title')}>
          {LIVE_FILTERS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={params.live === k}
              className={styles.chip}
              onClick={() => onParams({ live: k, page: 1 })}
            >
              <i className={styles.chipDot} style={{ background: FILTER_COLORS[k] }} />
              <span>{t(k)}</span> <b>{counts[k]}</b>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        {visible.map((m) => (
          <LiveTile
            key={m.id}
            member={m}
            selected={m.id === selectedId}
            ago={ago.live}
            onPick={onPick}
          />
        ))}
      </div>
      {rows.length ? (
        <Pagination
          page={page}
          size={params.size}
          total={rows.length}
          sizeOptions={[...LIVE_PAGE_SIZES]}
          labels={{ unit: t('unit') }}
          onChange={(p) => onParams({ page: p })}
          onSizeChange={(s) => onParams({ size: s, page: 1 })}
        />
      ) : (
        <div className={styles.empty}>{t('empty')}</div>
      )}
      <div className={styles.rate}>
        <span className={styles.rateLabel}>{t('activeRate')}</span>
        <span className={styles.rateBar}>
          <span style={{ width: `${pct}%` }} />
        </span>
        <b className={styles.ratePct}>{pct}%</b>
      </div>
    </section>
  );
}
