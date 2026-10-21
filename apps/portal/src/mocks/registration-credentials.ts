import { z } from 'zod';

const PREFIX = 'opchub-msw-private-credential-v1:';
const recordSchema = z
  .strictObject({
    email: z.email(),
    salt: z.string().regex(/^[a-f0-9]{32}$/),
    verifier: z.string().regex(/^[a-f0-9]{64}$/),
    state: z.enum(['pending', 'active']),
    expiresAt: z.number().int().nonnegative(),
    userId: z.string().nullable(),
  })
  .refine((row) =>
    row.state === 'pending' ? row.userId === null : row.userId === `n-${row.email}`,
  );
type Credential = z.infer<typeof recordSchema>;
type PrivateStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const normalize = (email: string) => email.trim().toLowerCase();
const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

async function derive(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bytes = Uint8Array.from(salt.match(/../g) ?? [], (part) => parseInt(part, 16));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: bytes, iterations: 100000 },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

/** MSW-only, Portal-origin private persistence. Never part of the public bridge.
 * Browser reloads retain only salted verifiers, not submitted passwords.
 */
export function registrationCredentials(storage: PrivateStorage = localStorage) {
  const keyOf = (email: string) => `${PREFIX}${encodeURIComponent(normalize(email))}`;
  function read(email: string): Credential | null {
    try {
      const raw = storage.getItem(keyOf(email));
      const parsed = recordSchema.safeParse(raw ? (JSON.parse(raw) as unknown) : null);
      return parsed.success && parsed.data.email === normalize(email) ? parsed.data : null;
    } catch {
      return null;
    }
  }
  return {
    async stage(email: string, password: string, now = Date.now()): Promise<void> {
      const key = keyOf(email);
      if (!password) {
        storage.removeItem(key);
        return;
      }
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const row: Credential = {
        email: normalize(email),
        salt,
        verifier: await derive(password, salt),
        state: 'pending',
        expiresAt: now + 1800000,
        userId: null,
      };
      storage.setItem(key, JSON.stringify(recordSchema.parse(row)));
    },
    activate(email: string, userId: string, now = Date.now()): void {
      const row = read(email);
      if (!row || row.state !== 'pending' || row.expiresAt <= now || userId !== `n-${row.email}`)
        return;
      storage.setItem(keyOf(email), JSON.stringify({ ...row, state: 'active', userId }));
    },
    async authenticate(email: string, password: string): Promise<string | null> {
      const row = read(email);
      if (!password || !row || row.state !== 'active') return null;
      const actual = await derive(password, row.salt);
      let mismatch = actual.length ^ row.verifier.length;
      for (let i = 0; i < actual.length; i++)
        mismatch |= actual.charCodeAt(i) ^ row.verifier.charCodeAt(i);
      return mismatch === 0 ? row.userId : null;
    },
  };
}
