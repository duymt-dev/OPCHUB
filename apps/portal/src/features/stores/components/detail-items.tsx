'use client';

import type { StoreItem } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { formatPrice } from '../model';
import styles from './detail.module.css';
import base from './stores.module.css';

/** Sản phẩm & Dịch vụ (prototype `st.d.items`): giá VND hoặc "Liên hệ báo giá" */
export function DetailItems({ items }: { items: StoreItem[] }) {
  const t = useTranslations('stores');
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <span>{t('detail.products')}</span>
      </div>
      {items.length === 0 ? (
        <div className={styles.none}>{t('detail.noItems')}</div>
      ) : (
        <div className={styles.items}>
          {items.map((i) => (
            <div key={i.id} className={styles.item}>
              <div
                className={styles.itemImg}
                style={i.imageUrl ? { backgroundImage: `url('${i.imageUrl}')` } : undefined}
              />
              <div className={styles.itemBody}>
                <span className={base.kindTag} data-kind={i.kind}>
                  {t(`kindLabel.${i.kind}`)}
                </span>
                <span className={styles.itemName}>{i.name}</span>
                <span className={styles.itemDesc}>{i.description}</span>
                <b className={styles.itemPrice}>
                  {formatPrice(i.price) ?? t('detail.contactPrice')}
                </b>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
