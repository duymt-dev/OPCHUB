import type { AdminNeedFilter } from '@opchub/shared/api-domains';

export interface NeedParams {
  status: AdminNeedFilter;
  q: string;
  page: number;
}
