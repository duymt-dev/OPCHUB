import { affiliateCodeResultSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

export const referralKeys = {
  check: (code: string, email: string) => ['public-affiliate-code', code, email] as const,
};

export function checkReferralCode(code: string, email = '') {
  const parsed = z.email().safeParse(email.trim());
  const query = parsed.success ? `?email=${encodeURIComponent(parsed.data)}` : '';
  return api(`/public/affiliate/codes/${encodeURIComponent(code)}${query}`, {
    schema: affiliateCodeResultSchema,
  });
}

export const trackReferralClick = (code: string) =>
  api('/public/affiliate/click', {
    method: 'POST',
    body: { code },
    schema: z.null(),
  });
