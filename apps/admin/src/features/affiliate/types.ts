import type { z } from 'zod';
import type {
  affiliateAdminCustomersSchema,
  affiliateCommissionRowSchema,
  affiliateDetailSchema,
  affiliateMonthRowSchema,
  affiliateSummarySchema,
} from '@opchub/shared/api-domains';
import type { affiliateParamsSchema, affiliateDetailParamsSchema } from './model';

export type AffiliateParams = z.infer<typeof affiliateParamsSchema>;
export type AffiliateDetailParams = z.infer<typeof affiliateDetailParamsSchema>;
export type CommissionRow = z.infer<typeof affiliateCommissionRowSchema>;
export type AffiliateDetail = z.infer<typeof affiliateDetailSchema>;
export type AffiliateMonthRow = z.infer<typeof affiliateMonthRowSchema>;
export type AffiliateCustomer = z.infer<typeof affiliateAdminCustomersSchema>['items'][number];
export type AffiliateSummary = z.infer<typeof affiliateSummarySchema>;
