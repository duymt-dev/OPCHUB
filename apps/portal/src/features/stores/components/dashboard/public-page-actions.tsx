'use client';
import type { StorePublicConfig } from '@opchub/shared/api-domains';
import { Button } from 'antd';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import styles from './public-page.module.css';
export function PublicPageActions({ data }: { data: StorePublicConfig }) {
  const t = useTranslations('stores.publicPage');
  const toast = useToast();
  const link = useRef<HTMLInputElement | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      toast(t('copied'));
    } catch {
      link.current?.focus();
      link.current?.select();
      toast(t('copyError'));
    }
  };
  return (
    <>
      <div className={styles.head}>
        <div className={styles.heading}>
          <h2>{t('title')}</h2>
          <span>{t('subtitle')}</span>
        </div>
        <div className={styles.actions}>
          <Button href={`/g/${data.slug}`} target="_blank" rel="noopener">
            {t('view')}
          </Button>
          <Button
            type="primary"
            onClick={() => {
              void copy();
            }}
          >
            {t('copy')}
          </Button>
        </div>
      </div>
      <input
        ref={link}
        className={styles.link}
        aria-label={t('link')}
        value={data.url.replace(/^https?:\/\//, '')}
        readOnly
      />
    </>
  );
}
