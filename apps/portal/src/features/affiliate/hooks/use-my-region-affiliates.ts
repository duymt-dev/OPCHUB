'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { encodeMyRegionAffiliateCursor } from '@opchub/shared/api-domains';
import { useAuthStore } from '@/lib/auth-store';
import { logger } from '@/lib/logger';
import { downloadRegionAffiliates, fetchRegionAffiliates } from '../api-region';
import { affiliateKeys } from '../api';
import type { DirectorRegion } from '../types';

export function useMyRegionAffiliates(data: DirectorRegion) {
  const userId = useAuthStore((s) => s.me?.id);
  const [downloading, setDownloading] = useState(false),
    [downloadError, setDownloadError] = useState(false);
  const last = data.affiliates.at(-1);
  const query = useInfiniteQuery({
    queryKey: [...affiliateKeys.region, userId, data.region, 'affiliates'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchRegionAffiliates(pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    initialData: {
      pages: [
        {
          items: data.affiliates,
          more: data.more,
          nextCursor:
            data.more && last
              ? encodeMyRegionAffiliateCursor({
                  share: String(last.share),
                  name: last.name,
                  id: last.id,
                })
              : null,
        },
      ],
      pageParams: [undefined],
    },
  });
  async function download() {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      await downloadRegionAffiliates();
    } catch (error) {
      setDownloadError(true);
      logger.warn('affiliate.my-region', error);
    } finally {
      setDownloading(false);
    }
  }
  const pages = query.data.pages;
  return {
    items: pages.flatMap((page) => page.items),
    more: pages.at(-1)?.more ?? 0,
    query,
    download,
    downloading,
    downloadError,
  };
}
