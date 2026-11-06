'use client';

import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import { env } from '@/lib/env';

export function StorePublicLink({ slug }: { slug: string | null | undefined }) {
  const t = useTranslations('stores.drawer');
  const toast = useToast();
  if (!slug) return null;
  const url = `${env.NEXT_PUBLIC_PORTAL_URL.replace(/\/$/, '')}/g/${slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast(t('publicCopied'));
    } catch {
      toast(t('publicCopyError'));
    }
  };
  return (
    <div>
      {t('publicPage')}:{' '}
      <a href={url} target="_blank" rel="noopener">
        {url.replace(/^https?:\/\//, '')}
      </a>{' '}
      <button
        type="button"
        onClick={() => {
          void copy();
        }}
      >
        {t('publicCopy')}
      </button>
    </div>
  );
}
