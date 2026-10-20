'use client';

import { installMockAffiliateHost } from '@opchub/shared/mock-affiliate-browser';
import { useEffect } from 'react';

/** No application UI, authentication state or network backend lives in this relay. */
export function AffiliateStateHost() {
  useEffect(() => installMockAffiliateHost(), []);
  return null;
}
