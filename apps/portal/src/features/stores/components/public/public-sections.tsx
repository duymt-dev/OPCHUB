import type { StorePublicPage } from '@opchub/shared/api-domains';
import { getTranslations } from 'next-intl/server';
import { DetailItems } from '../detail-items';
import { DetailCerts, DetailTeam, DetailVisionMission } from '../detail-profile';
import { DetailGallery } from '../detail-media';
import { DetailContact } from '../detail-contact';
import styles from './public.module.css';

export async function PublicSections({ s }: { s: StorePublicPage }) {
  const t = await getTranslations('stores.detail');
  const hasContact = [
    s.phone,
    s.email,
    s.address,
    s.website,
    ...s.phones,
    ...s.emails,
    ...s.addresses,
    ...Object.values(s.socials),
  ].some(Boolean);
  return (
    <>
      {s.intro.trim() ? (
        <section className={styles.section}>
          <h2>{t('intro')}</h2>
          <p>{s.intro}</p>
        </section>
      ) : null}
      {s.items.length ? (
        <DetailItems items={s.items.map((item, i) => ({ ...item, id: String(i) }))} />
      ) : null}
      <DetailVisionMission s={s} />
      <DetailTeam s={s} />
      <DetailCerts s={s} />
      <DetailGallery s={s} />
      {s.videos.length ? (
        <section className={styles.section}>
          <h2>{t('profile.gallery')}</h2>
          <div className={styles.videos}>
            {s.videos.map((v) => (
              <figure key={v.url}>
                <video controls preload="metadata" src={v.url}>
                  <track kind="captions" />
                </video>
                <figcaption>{v.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      {hasContact ? <DetailContact s={s} /> : null}
    </>
  );
}
