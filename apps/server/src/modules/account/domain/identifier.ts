/**
 * Định danh đăng nhập: email hoặc SĐT (UP-01). SĐT lưu E.164; người dùng Việt Nam hay gõ
 * `0912 345 678` hoặc `+84 912…` nên chuẩn hoá trước khi tra.
 */
export type LoginIdentifier = { kind: 'email'; email: string } | { kind: 'phone'; phone: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** `0912345678` | `84912345678` | `+84 912 345 678` → `+84912345678`; số khác giữ `+` + chữ số */
export function normalizePhone(raw: string, defaultCountryCode = '84'): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('0')) return `+${defaultCountryCode}${digits.slice(1)}`;
  if (digits.startsWith(defaultCountryCode)) return `+${digits}`;
  return `+${defaultCountryCode}${digits}`;
}

export function parseIdentifier(raw: string): LoginIdentifier | null {
  const v = raw.trim();
  if (EMAIL_RE.test(v)) return { kind: 'email', email: v.toLowerCase() };
  const phone = normalizePhone(v);
  return phone ? { kind: 'phone', phone } : null;
}
