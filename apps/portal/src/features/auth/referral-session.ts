import { checkReferralCode } from './referral-api';
import { ApiError } from '@/lib/api-client';
import { referralCookie } from './referral-model';

/** Preserve the user's chosen code across the external OAuth redirect (including opt-out). */
export async function prepareSsoReferral(code: string, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return;
  if (!code) {
    document.cookie = 'opc_ref=; Max-Age=0; Path=/; SameSite=Lax';
    return;
  }
  const result = await checkReferralCode(code);
  if (signal?.aborted) return;
  if (!result.valid)
    throw new ApiError('VALIDATION_ERROR', 400, result.message, [
      { path: 'referralCode', message: result.message },
    ]);
  document.cookie = referralCookie(code, result.cookieDays, location.protocol === 'https:');
}
