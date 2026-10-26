'use client';

import type { AdminStore } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { itemPrice, storeDate } from '../model';
import { StoreStatusTag } from './store-status';
import styles from './store-drawer.module.css';

interface Props {
  x: AdminStore;
  canAct: boolean;
  onClose: () => void;
  onHide: () => void;
  onShow: () => void;
}

function DrawerItems({ x }: { x: AdminStore }) {
  const t = useTranslations('stores.drawer');
  const kind = useTranslations('stores.kind');
  return x.items.map((i) => (
    <div key={i.id} className={styles.item}>
      <div className={styles.itemImg}>
        {i.imageUrl ? (
          <div className={styles.coverImg} style={{ backgroundImage: `url('${i.imageUrl}')` }} />
        ) : null}
      </div>
      <div className={styles.itemText}>
        <span className={styles.itemName}>{i.name}</span>
        <span className={styles.itemDesc}>
          {kind(i.kind)} · {i.description}
        </span>
      </div>
      <b className={styles.price}>{itemPrice(i, t('contactPrice'))}</b>
    </div>
  ));
}

/**
 * Prototype "Chi tiết gian hàng" (panel phải 560px). Tự vẽ role=dialog (không motion antd — parity
 * dừng đồng hồ); Esc / bấm nền / × đóng.
 */
export function StoreDrawer({ x, canAct, onClose, onHide, onShow }: Props) {
  const t = useTranslations('stores.drawer');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const loc = [x.field, x.province].filter(Boolean).join(' · ');
  const contact = [x.phone, x.email, x.address].join(' · ');

  return (
    <div className={styles.mask}>
      <button type="button" aria-label={t('close')} className={styles.backdrop} onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="st-title">
        <div className={styles.head}>
          <span id="st-title" className={styles.title}>
            {t('title')}
          </span>
          <button type="button" aria-label={t('close')} className={styles.x} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.cover}>
            {x.coverUrl ? (
              <div
                className={styles.coverImg}
                style={{ backgroundImage: `url('${x.coverUrl}')` }}
              />
            ) : null}
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{x.name}</span>
              <StoreStatusTag status={x.status} />
            </div>
            <span className={styles.slogan}>{x.slogan}</span>
            <span className={styles.meta}>
              {t('meta', { owner: x.ownerName, loc, date: storeDate(x.updatedAt) })}
            </span>
            <span className={styles.intro}>{x.intro}</span>
            <span className={styles.contact}>{contact}</span>
          </div>
          <div className={styles.section}>{t('items')}</div>
          <DrawerItems x={x} />
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.ghost} onClick={onClose}>
            {t('closeBtn')}
          </button>
          {canAct && x.status !== 'hidden' ? (
            <button type="button" className={styles.danger} onClick={onHide}>
              {t('hide')}
            </button>
          ) : null}
          {canAct && x.status === 'hidden' ? (
            <button type="button" className={styles.primary} onClick={onShow}>
              {t('show')}
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
