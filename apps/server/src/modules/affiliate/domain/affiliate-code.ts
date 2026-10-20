/**
 * Mã đại lý (prototype `mkCode`, AF-R01): họ tên bỏ dấu, `đ → D`, in hoa → từ cuối (≤ 6 ký tự)
 * + `OPC` + 2 số 10–99 băm từ tên. Trùng mã → `attempt` đổi hậu tố; quá 20 lần → 3 chữ số.
 */
const MAX_TWO_DIGIT_ATTEMPTS = 20;

export function stripName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .trim();
}

/** Băm như prototype: x*31 + mã ký tự, 32-bit có dấu, hạt giống 7 */
function nameHash(name: string): number {
  let x = 7;
  for (const ch of name) x = (Math.imul(x, 31) + (ch.codePointAt(0) ?? 0)) | 0;
  return Math.abs(x);
}

export function affiliateCode(fullName: string, attempt = 0): string {
  const words = stripName(fullName).split(/\s+/).filter(Boolean);
  const stem = (words.at(-1) ?? 'OPC').slice(0, 6);
  const h = nameHash(fullName) + attempt;
  const suffix = attempt < MAX_TWO_DIGIT_ATTEMPTS ? (h % 90) + 10 : (h % 900) + 100;
  return `${stem}OPC${suffix}`;
}

export const AFFILIATE_CODE_RE = /^[A-Z]{1,6}OPC\d{2,3}$/;
