import type { AdminStoreFilter } from '@opchub/shared/api-domains';

export interface StoreParams {
  status: AdminStoreFilter;
  q: string;
  page: number;
}
