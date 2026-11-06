'use client';
import type { StorePublicConfig } from '@opchub/shared/api-domains';
import { Button, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';
import type { StorePublicSave } from '../../types';
import { useStorePublic } from '../../hooks/use-store-public';
import { usePublicPageDraft } from '../../hooks/use-public-page-draft';
import { PublicPageActions } from './public-page-actions';
import { PublicPageFields } from './public-page-fields';
import styles from './public-page.module.css';
function PublicFields({ data, save }: { data: StorePublicConfig; save: StorePublicSave }) {
  const t = useTranslations('stores.publicPage');
  const draft = usePublicPageDraft(data, save);
  return (
    <section className={styles.card} data-block="store-public-card" aria-label={t('title')}>
      <PublicPageActions data={data} />
      {data.status !== 'published' ? (
        <span className={styles.warning}>{t(draft.hidden ? 'hidden' : 'draft')}</span>
      ) : null}
      <PublicPageFields data={data} draft={draft} />
    </section>
  );
}
export function PublicPageCard() {
  const query = useStorePublic();
  const t = useTranslations('stores.publicPage');
  if (query.isPending)
    return (
      <div className={styles.card}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  if (!query.data)
    return (
      <div role="alert" className={styles.card}>
        {t('loadError')}
        <Button
          onClick={() => {
            void query.refetch();
          }}
        >
          {t('retry')}
        </Button>
      </div>
    );
  return <PublicFields key={query.data.slug} data={query.data} save={query.save} />;
}
