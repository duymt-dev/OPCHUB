import { affiliateCodeSchema } from '@opchub/shared/api-domains';

export const normalizeReferral = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);

export function referralFromCookie(cookie: string): string {
  const value = cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('opc_ref='))
    ?.slice(8);
  try {
    return value ? normalizeReferral(decodeURIComponent(value)) : '';
  } catch {
    return '';
  }
}

/** Prefill only; a subsequent manual edit always remains editable. */
export const initialReferral = (urlValue: string | null, cookie: string) =>
  normalizeReferral(urlValue?.trim() || referralFromCookie(cookie));

export const validReferralLink = (code: string) => affiliateCodeSchema.safeParse(code).success;

export function referralCookie(code: string, cookieDays: number, secure: boolean) {
  const parsed = affiliateCodeSchema.parse(code);
  return `opc_ref=${parsed}; Max-Age=${cookieDays * 86400}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}
