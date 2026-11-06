'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useMyStoreDashboard } from '../../hooks/use-stores';
import { storeShortName } from '../../model';
import { PublicPageCard } from './public-page-card';
import { DashChart } from './dash-chart';
import { DashInfo, DashItems } from './dash-cards';
import d from './dashboard.module.css';

const HERO =
  'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=1600&h=400&fit=crop&auto=format';
const EYE = 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z';
const STAR = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';
const NEED = 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11';

interface Props {
  store: StoreDetail;
  onEdit: (step?: 4) => void;
  onView: () => void;
}

/** % so với 7 ngày trước (làm tròn); không có số kỳ trước → không hiện */
const delta = (now: number, prev: number) =>
  prev > 0 ? Math.round(((now - prev) / prev) * 100) : null;

function Kpi(p: {
  label: string;
  value: string;
  sub: string;
  c: string;
  bg: string;
  ic: string;
  dl?: string;
}) {
  return (
    <div className={d.kpi}>
      <div className={d.kpiIcon} style={{ background: p.bg }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={p.c}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={p.ic} />
        </svg>
      </div>
      <div className={d.kpiText}>
        <span className={d.kpiLabel}>{p.label}</span>
        <div className={d.kpiRow}>
          <b className={d.kpiValue}>{p.value}</b>
          {p.dl ? <span className={d.kpiDl}>{p.dl}</span> : null}
        </div>
        <span className={d.kpiSub}>{p.sub}</span>
      </div>
    </div>
  );
}

/**
 * D-114 S6 "Gian hàng của tôi" — tổng quan chỉ số thật (prototype `st.dashMode`, index.html :2165 → 2235):
 * hero "Xin chào", KPI Lượt xem gian hàng (7 ngày, so tuần trước) · Sản phẩm · Nhu cầu đang mở, Thông tin
 * gian hàng, Hiệu suất 7 ngày (lượt xem thật), Sản phẩm & Dịch vụ. Bỏ Khách quan tâm / Lượt liên hệ /
 * Lịch hẹn / Tỷ lệ chuyển đổi / Hoạt động gần đây (không có nguồn dữ liệu — Q-V42-710-3).
 */
export function StoreDashboard({ store, onEdit, onView }: Props) {
  const t = useTranslations('stores.dash');
  const q = useMyStoreDashboard();
  const s = q.data;
  const dl = s ? delta(s.views7, s.viewsPrev7) : null;
  return (
    <div className={d.wrap} data-screen="stores-dashboard">
      <div className={d.hero} style={{ backgroundImage: `url('${HERO}')` }}>
        <div className={d.heroFade} />
        <div className={d.heroBody}>
          <span className={d.hello}>
            {t('hello', { name: storeShortName(store.name) || store.name })}
          </span>
          <span className={d.heroSub}>{t('heroSub')}</span>
        </div>
      </div>
      <div className={d.kpis}>
        <Kpi
          label={t('views')}
          value={(s?.views7 ?? 0).toLocaleString('vi-VN')}
          {...(dl !== null ? { dl: `${dl >= 0 ? '↑' : '↓'} ${Math.abs(dl)}%` } : {})}
          sub={t('viewsSub')}
          c="#1677FF"
          bg="#E6F4FF"
          ic={EYE}
        />
        <Kpi
          label={t('items')}
          value={String(store.items.length)}
          sub={t('itemsSub')}
          c="#C41D7F"
          bg="#FFF0F6"
          ic={STAR}
        />
        <Kpi
          label={t('needs')}
          value={String(s?.openNeeds ?? 0)}
          sub={t('needsSub')}
          c="#389E0D"
          bg="#F6FFED"
          ic={NEED}
        />
      </div>
      <div className={d.row}>
        <DashInfo store={store} onEdit={() => onEdit()} onView={onView} />
        <DashChart days={s?.days ?? []} />
      </div>
      <PublicPageCard />
      <div className={d.row}>
        <DashItems store={store} onManage={() => onEdit(4)} />
      </div>
    </div>
  );
}
