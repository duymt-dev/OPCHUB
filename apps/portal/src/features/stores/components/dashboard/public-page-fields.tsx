'use client';
import type { StorePublicConfig } from '@opchub/shared/api-domains';
import { Input, Switch } from 'antd';
import { useTranslations } from 'next-intl';
import type { usePublicPageDraft } from '../../hooks/use-public-page-draft';
import styles from './public-page.module.css';
export function PublicPageFields({
  data,
  draft,
}: {
  data: StorePublicConfig;
  draft: ReturnType<typeof usePublicPageDraft>;
}) {
  const t = useTranslations('stores.publicPage');
  const { title, desc, index, busy, hidden, setTitle, setDesc, commit, toggle } = draft;
  return (
    <>
      <div className={styles.google}>
        <div>
          <label htmlFor="store-google">{t('google')}</label>
          <p>{t(index ? 'googleOn' : 'googleOff')}</p>
        </div>
        <Switch
          id="store-google"
          checked={index}
          disabled={hidden || busy}
          onChange={(value) => {
            void toggle(value);
          }}
        />
      </div>
      <div className={styles.fields}>
        <label>
          <span>{t('seoTitle')}</span>
          <Input
            value={title}
            placeholder={data.defaultTitle}
            maxLength={70}
            disabled={hidden}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              void commit(title, desc);
            }}
          />
        </label>
        <label>
          <span>
            {t('desc')}
            <span aria-live="polite">{desc.length}/160</span>
          </span>
          <Input
            value={desc}
            placeholder={data.defaultDesc}
            maxLength={160}
            disabled={hidden}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => {
              void commit(title, desc);
            }}
          />
        </label>
      </div>
    </>
  );
}
