import type {
  RevenueDirector,
  RevenueDashboard,
  revenueMonthsSchema,
  revenueFormerSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';

export type RevenueCursor = { at: string; id: string } | null;
export interface RevenueTableProps {
  rows: RevenueDirector[];
  onPay: (row: RevenueDirector) => void;
  canPay: boolean;
}
export interface RevenuePayoutProps {
  row: RevenueDirector;
  onClose: () => void;
}
export interface RevenueHeaderProps {
  data: RevenueDashboard;
  query: string;
  onQuery: (q: string) => void;
}
export interface FormerRevenueProps {
  query: UseInfiniteQueryResult<InfiniteData<z.infer<typeof revenueFormerSchema>>>;
  onPay: (row: RevenueDirector) => void;
  canPay: boolean;
}
export interface RevenueIdentityProps {
  row: RevenueDirector;
  open: boolean;
  onToggle: () => void;
}
export interface RevenueMonthSelectProps {
  query: UseInfiniteQueryResult<InfiniteData<z.infer<typeof revenueMonthsSchema>>>;
  choices: z.infer<typeof revenueMonthsSchema>['items'];
  month: string | null;
  disabled: boolean;
  onChange: (month: string) => void;
}
