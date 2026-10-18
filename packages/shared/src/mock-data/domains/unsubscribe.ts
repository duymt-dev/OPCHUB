import { maskEmail } from '../../api-domains';
import { mockDb, type MockDb } from './store';

/**
 * BUG-036 (MSW): huỷ nhận thư chiến dịch. Token cùng định dạng server
 * `base64url(email).HMAC_SHA256_hex(secret, 'unsub|' + email)`, ký bằng secret giả công khai
 * `MOCK_UNSUBSCRIBE_SECRET` (e2e MSW ký cùng secret; e2e server dùng secret thật của server).
 */
export const MOCK_UNSUBSCRIBE_SECRET = 'opchub-mock-unsubscribe-secret-0000000000';

const TOKEN_RE = /^([A-Za-z0-9_-]+)\.([a-f0-9]{64})$/i;

async function mac(secret: string, email: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`unsub|${email}`)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const b64url = (s: string) => {
  const bin = [...new TextEncoder().encode(s)].map((b) => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const unb64url = (s: string): string | null => {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
};

/** Ký token (test / e2e) */
export async function signUnsubscribeToken(
  email: string,
  secret = MOCK_UNSUBSCRIBE_SECRET,
): Promise<string> {
  const e = email.trim().toLowerCase();
  return `${b64url(e)}.${await mac(secret, e)}`;
}

/** Email trong token khi chữ ký đúng; sai → null */
export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  const m = TOKEN_RE.exec(token);
  if (!m?.[1] || !m[2]) return null;
  const email = unb64url(m[1]);
  if (!email?.includes('@')) return null;
  return (await mac(MOCK_UNSUBSCRIBE_SECRET, email)) === m[2].toLowerCase() ? email : null;
}

const states = new WeakMap<MockDb, Set<string>>();

/** Danh sách email đã huỷ nhận (theo MockDb — `resetMockDb()` dựng lại) */
export function suppressions(): Set<string> {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = new Set();
    states.set(db, s);
  }
  return s;
}

export const unsubscribeInfo = (email: string) => ({ email: maskEmail(email) });

/** Idempotent như `ON CONFLICT DO NOTHING` */
export function unsubscribeEmail(email: string) {
  suppressions().add(email.toLowerCase());
  return { email: maskEmail(email), unsubscribed: true as const };
}
