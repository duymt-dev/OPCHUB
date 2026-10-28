'use client';

import type { StoreUpsert } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { formatPrice, storeInitials, storeLocation, storeSocialLinks } from '../../model';
import { SocialIcon } from './social-icon';
import p from './preview.module.css';

/**
 * "Xem trước gian hàng" (prototype `st.wz.pv`, index.html :2140 → 2160): bìa 16:7, logo 48px, tên / slogan,
 * thẻ ngành · đối tượng · địa phương, giới thiệu 4 dòng, 3 SP đầu, Hotline · Địa chỉ, mạng xã hội
 */
export function WizardPreview({ draft }: { draft: StoreUpsert }) {
  const t = useTranslations('stores');
  const w = useTranslations('stores.wizard.pv');
  const soc = useTranslations('stores.wizard.social');
  const phones = [draft.phone, ...draft.phones].filter((x) => x.trim()).join(' · ');
  return (
    <div className={p.wrap}>
      <span className={p.label}>{w('title')}</span>
      <div className={p.card}>
        <div className={p.cover}>
          {draft.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa storage / ảnh mẫu
            <img src={draft.coverUrl} alt="" className={p.img} />
          ) : (
            <div className={p.noCover}>{w('cover')}</div>
          )}
          <span className={p.logo}>
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo storage động
              <img src={draft.logoUrl} alt="" className={p.img} />
            ) : (
              storeInitials(draft.name || 'DN')
            )}
          </span>
        </div>
        <div className={p.body}>
          <div className={p.names}>
            <span className={p.name}>{draft.name || w('name')}</span>
            <span className={p.slogan}>{draft.slogan || w('slogan')}</span>
          </div>
          <div className={p.tags}>
            <span className={p.tagBlue}>{draft.field || w('field')}</span>
            <span className={p.tag}>{t(`audience.${draft.audience}`)}</span>
            <span className={p.tag}>{storeLocation(draft) || w('location')}</span>
          </div>
          <span className={p.intro}>{draft.intro.trim() || w('intro')}</span>
          <div className={p.items}>
            <span className={p.muted}>{w('items', { n: draft.items.length })}</span>
            {draft.items.slice(0, 3).map((i, ix) => (
              <div key={`${i.name}-${ix}`} className={p.itemRow}>
                <span className={p.itemName}>{i.name}</span>
                <span className={p.itemPrice}>{formatPrice(i.price) ?? w('contact')}</span>
              </div>
            ))}
          </div>
          <div className={p.contact}>
            <span className={p.muted}>{w('hotline')}</span>
            <span>{phones || '—'}</span>
            <span className={p.muted}>{w('address')}</span>
            <span className={p.addr}>{draft.address || '—'}</span>
          </div>
          <div className={p.socials}>
            {storeSocialLinks(draft).map((o) => (
              <span key={o.k} title={soc(o.k)}>
                <SocialIcon k={o.k} size={28} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
