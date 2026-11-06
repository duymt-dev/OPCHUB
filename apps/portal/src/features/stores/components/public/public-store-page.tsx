import Image from 'next/image';
import type { StorePublicPage as PublicData } from '@opchub/shared/api-domains';
import { getTranslations } from 'next-intl/server';
import { PublicHeader } from './public-header';
import { PublicSections } from './public-sections';
import styles from './public.module.css';

/** Anonymous SSR page: no session API, owner controls or private document links. */
export async function PublicStorePage({ store: s }: { store: PublicData }) {
  const t = await getTranslations('stores.guest');
  return (
    <div className={styles.page} data-screen="store-public">
      <PublicHeader />
      <main className={styles.main}>
        <section className={styles.hero}>
          {s.coverUrl ? (
            <div className={styles.cover} style={{ backgroundImage: `url('${s.coverUrl}')` }} />
          ) : null}
          <div className={styles.identity}>
            {s.logoUrl ? <Image src={s.logoUrl} alt="" width={80} height={80} unoptimized /> : null}
            <div>
              <h1>{s.name}</h1>
              {s.slogan ? <p>{s.slogan}</p> : null}
              <span>
                {[s.field, [s.ward, s.province].filter(Boolean).join(', ')]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </div>
        </section>
        <PublicSections s={s} />
      </main>
      <footer className={styles.footer}>
        © 2026 OPC Hub<p>{t('footer')}</p>
      </footer>
    </div>
  );
}
