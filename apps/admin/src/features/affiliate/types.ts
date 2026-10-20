import type { z } from 'zod';
import type { ReactNode } from 'react';
import type {
  AffiliateAdminListRow,
  affiliateAdminCustomersSchema,
  affiliateCommissionRowSchema,
  affiliateDetailSchema,
  affiliateMonthRowSchema,
  affiliateSummarySchema,
} from '@opchub/shared/api-domains';
import type { affiliateParamsSchema, affiliateDetailParamsSchema } from './model';

export type AffiliateParams = z.infer<typeof affiliateParamsSchema>;
export type AffiliateAgentIdentityProps = Pick<
  AffiliateAdminListRow,
  'id' | 'name' | 'email' | 'status' | 'bank'
>;
export type AffiliateAgentPeriod = AffiliateAdminListRow['period'];
export interface AffiliateAgentPeriodProps {
  period: AffiliateAgentPeriod;
}
export interface AffiliateAgentPeriodStatusProps {
  status: AffiliateAgentPeriod['status'];
}
export interface AffiliateAgentMonthSelectProps {
  value: string;
  onChange: (month: string) => void;
}
export type AffiliateDetailParams = z.infer<typeof affiliateDetailParamsSchema>;
export type CommissionRow = z.infer<typeof affiliateCommissionRowSchema>;
export type AffiliateDetail = z.infer<typeof affiliateDetailSchema>;
export type AffiliateMonthRow = z.infer<typeof affiliateMonthRowSchema>;
export type AffiliateCustomer = z.infer<typeof affiliateAdminCustomersSchema>['items'][number];
export type AffiliateSummary = z.infer<typeof affiliateSummarySchema>;
export type AffiliateStatusCounts = Record<
  'all' | 'recorded' | 'paid' | 'cancelled',
  number | undefined
>;

export interface AffiliateListTableProps<Row> {
  rows: Row[];
  total: number;
  params: AffiliateParams;
  update: (patch: Partial<AffiliateParams>) => void;
  header: ReactNode;
  toolbar: ReactNode;
  loading: boolean;
}

export interface CommissionBulkBarProps {
  count: number;
  onClear: () => void;
  onCancel: () => void;
  onExport: () => void;
  exportLoading: boolean;
}

export interface AffiliateRateEditorProps {
  id: string;
  rate: number;
}

export interface AffiliateDetailTabsProps {
  tab: AffiliateDetailParams['tab'];
  customers: number | undefined;
  update: (patch: Partial<AffiliateDetailParams>) => void;
}

export interface AffiliateCustomerHistoryProps {
  row: AffiliateCustomer;
}

export interface AffiliateAgentBulkBarProps {
  count: number;
  onClear: () => void;
  onEdit: () => void;
  onExport: () => void;
  exportLoading: boolean;
}

export interface AffiliateCustomersTableProps {
  rows: AffiliateCustomer[];
  total: number;
  params: AffiliateDetailParams;
  update: (patch: Partial<AffiliateDetailParams>) => void;
  header: ReactNode;
  loading: boolean;
}

export interface AffiliatePaging {
  page: number;
  size: number;
}

export interface AffiliatePaginationProps {
  total: number;
  params: AffiliatePaging;
  update: (patch: Partial<AffiliatePaging>) => void;
  unit?: string;
  sizes?: number[];
}
