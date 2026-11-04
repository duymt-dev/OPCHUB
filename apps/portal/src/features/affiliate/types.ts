import type { MyRegion, AffiliateReferrals, MyAffiliate } from '@opchub/shared/api-domains';

export type ActiveAffiliate = Exclude<MyAffiliate, { state: 'locked' }>;
export type ReferralRow = AffiliateReferrals['items'][number];
export type BankField = 'bankName' | 'bankNo' | 'bankHolder';

export type DirectorRegion = Extract<MyRegion, { state: 'director' }>;
