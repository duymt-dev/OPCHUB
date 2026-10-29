'use client';

import type { StoreDashboard } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import d from './dashboard.module.css';

const C = '#1677FF';
const X = (i: number) => 40 + i * (560 / 6);

/** Trục tung tròn lên bội 4 để 5 vạch chia đều (prototype `grid` 0 → 400) */
const niceMax = (v: number) => {
  const step = Math.max(1, Math.ceil(v / 4));
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(step)));
  return Math.ceil(step / mag) * mag * 4;
};

/**
 * "Hiệu suất gian hàng · 7 ngày qua" (prototype SVG 620×205, index.html :2190 → 2198) — một đường
 * Lượt xem thật theo ngày (D-114 S6). Khách quan tâm / Liên hệ không có nguồn dữ liệu → bỏ.
 */
export function DashChart({ days }: { days: StoreDashboard['days'] }) {
  const t = useTranslations('stores.dash');
  const max = niceMax(Math.max(0, ...days.map((x) => x.views)));
  const Y = (v: number) => 180 - (v / max) * 160;
  const pts = days.map((x, i) => `${X(i).toFixed(1)} ${Y(x.views).toFixed(1)}`);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p}`).join(' ');
  const area = days.length
    ? `M${X(0)} 180 ${pts.map((p) => `L${p}`).join(' ')} L${X(6)} 180 Z`
    : '';
  return (
    <section className={d.card}>
      <div className={d.cardHead}>
        <span className={d.cardTitle}>{t('perf')}</span>
        <span className={d.cardMeta}>{t('last7')}</span>
      </div>
      <div className={d.chart}>
        <div className={d.legend}>
          <span className={d.legendItem}>
            <span className={d.legendLine} style={{ background: C }} />
            {t('viewsLine')}
          </span>
        </div>
        <svg viewBox="0 0 620 205" className={d.svg} role="img" aria-label={t('perf')}>
          {[0, 1, 2, 3, 4].map((k) => {
            const v = (max / 4) * k;
            return (
              <g key={k}>
                <line x1="40" x2="600" y1={Y(v)} y2={Y(v)} stroke="#F0F0F0" />
                <text x="32" y={Y(v) + 4} textAnchor="end" fontSize="11" fill="rgba(0,0,0,0.45)">
                  {v}
                </text>
              </g>
            );
          })}
          {days.length ? (
            <>
              <path d={area} fill={C} fillOpacity="0.06" />
              <path
                d={line}
                fill="none"
                stroke={C}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : null}
          {days.map((x, i) => (
            <text
              key={x.day}
              x={X(i)}
              y="200"
              textAnchor="middle"
              fontSize="11"
              fill="rgba(0,0,0,0.45)"
            >
              {`${x.day.slice(8, 10)}/${x.day.slice(5, 7)}`}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}
