'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { MARKETING_TABS, type MarketingParams } from '../types';

/** Tab Chiến dịch / Email tự động / Nhật ký gửi nằm trên URL (data-state.md) */
const schema = z.object({ tab: z.enum(MARKETING_TABS).catch('campaigns') });

export function useMarketingParams() {
  return useUrlParams<MarketingParams>(schema);
}
