'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { formatPrice } from '../../model';
import d from './dashboard.module.css';

/** Public guest traffic remains independent of member views/digest/push KPIs. */
export function GuestViewsKpi({ views }: { views: number }) {
  const t = useTranslations('stores.dash');
  return (
    <div className={d.kpi} data-kpi="guest-views">
      <div className={d.kpiText}>
        <span className={d.kpiLabel}>{t('guestViews')}</span>
        <div className={d.kpiRow}>
          <b className={d.kpiValue}>{views.toLocaleString('vi-VN')}</b>
        </div>
        <span className={d.kpiSub}>{t('viewsSub')}</span>
      </div>
    </div>
  );
}

/** "Thông tin gian hàng": bìa, nhãn trạng thái, tên, "ngành · tỉnh", địa chỉ, giới thiệu 3 dòng, 2 nút */
export function DashInfo(p: { store: StoreDetail; onEdit: () => void; onView: () => void }) {
  const t = useTranslations('stores');
  const s = p.store;
  return (
    <section className={d.card}>
      <div className={d.cardHead}>
        <span className={d.cardTitle}>{t('mine.info')}</span>
      </div>
      <div className={d.info}>
        <div className={d.infoCover}>
          <div
            className={d.infoImg}
            style={s.coverUrl ? { backgroundImage: `url('${s.coverUrl}')` } : undefined}
          />
        </div>
        <div className={d.infoText}>
          <span className={d.status} data-status={s.status}>
            {t(`status.${s.status}`)}
          </span>
          <span className={d.infoName}>{s.name}</span>
          <span className={d.infoLoc}>{[s.field, s.province].filter(Boolean).join(' · ')}</span>
          <span className={d.infoAddr}>{s.address}</span>
          <span className={d.infoIntro}>{s.intro}</span>
          <div className={d.infoBtns}>
            <button type="button" className={d.btnPrimary} onClick={p.onEdit}>
              {t('dash.edit')}
            </button>
            <button type="button" className={d.btn} onClick={p.onView}>
              {t('dash.view')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** "Sản phẩm & Dịch vụ" + "Quản lý" (mở bước 4): thẻ ảnh 16:10, tên, mô tả, nhãn loại, giá */
export function DashItems(p: { store: StoreDetail; onManage: () => void }) {
  const t = useTranslations('stores');
  const items = p.store.items;
  return (
    <section className={d.card}>
      <div className={d.cardHead}>
        <span className={d.cardTitle}>{t('mine.items')}</span>
        <button type="button" className={d.manage} onClick={p.onManage}>
          {t('dash.manage')}
        </button>
      </div>
      <div className={d.prods} data-block="store-dashboard-items">
        {items.map((i) => (
          <div key={i.id} className={d.prod}>
            <div className={d.prodImgBox}>
              <div
                className={d.prodImg}
                style={i.imageUrl ? { backgroundImage: `url('${i.imageUrl}')` } : undefined}
              />
            </div>
            <div className={d.prodBody}>
              <span className={d.prodName}>{i.name}</span>
              <span className={d.prodDesc}>{i.description}</span>
              <div className={d.prodFoot}>
                <span className={d.kind} data-kind={i.kind}>
                  {t(`kindLabel.${i.kind}`)}
                </span>
                <b className={d.price}>{formatPrice(i.price) ?? t('detail.contactPrice')}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 ? <div className={d.noItems}>{t('dash.noItems')}</div> : null}
    </section>
  );
}
