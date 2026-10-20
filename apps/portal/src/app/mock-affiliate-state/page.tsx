import { notFound } from 'next/navigation';
import { env } from '@/lib/env';
import { AffiliateStateHost } from '@/mocks/affiliate-state-host';

export default function MockAffiliateStatePage() {
  if (env.NEXT_PUBLIC_API_MOCKING !== 'msw') notFound();
  return <AffiliateStateHost />;
}
