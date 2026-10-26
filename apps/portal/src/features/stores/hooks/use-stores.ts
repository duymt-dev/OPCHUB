'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ExploreFilter, fetchMyStore, fetchStore, fetchStores, storeKeys } from '../api';

export const useStoreList = (f: ExploreFilter) =>
  useQuery({
    queryKey: storeKeys.list(f),
    queryFn: () => fetchStores(f),
    placeholderData: keepPreviousData,
  });

export const useStore = (id: string) =>
  useQuery({ queryKey: storeKeys.detail(id), queryFn: () => fetchStore(id), retry: false });

/** Gian hàng của tôi — chỉ TK Doanh nghiệp đã đóng phí (server 403 / 404 cho trường hợp khác) */
export const useMyStore = (enabled: boolean) =>
  useQuery({ queryKey: storeKeys.mine(), queryFn: fetchMyStore, enabled, retry: false });
