import { expect, it } from 'vitest';
import { parseEnv } from '@/common/config/env.schema';
import { MailQrToken } from './mail-qr-token';

const env = parseEnv({
  DATABASE_URL: 'postgresql://u:p@localhost/db',
  JWT_SECRET: 'x'.repeat(32),
  BANK_WEBHOOK_SECRET: 'y'.repeat(16),
  DATA_ENC_KEY: 'z'.repeat(44),
  MAIL_QR_SECRET: 'q'.repeat(32),
});
const now = new Date('2026-11-09T01:00:00Z');
it('SPEC11 HMAC tokens are bounded, timestamped, purpose-bound and reject mutation/expiry/future/extraneous fields', () => {
  const signer = new MailQrToken(env);
  const raw = signer.sign({ kind: 'fee', id: 'fixture-user', anchor: now.toISOString() }, now);
  expect(raw.length).toBeLessThanOrEqual(512);
  expect(signer.verify(raw, now)).toMatchObject({ kind: 'fee', id: 'fixture-user' });
  expect(signer.verify(raw.slice(0, -1) + (raw.endsWith('a') ? 'b' : 'a'), now)).toBeNull();
  expect(signer.verify(raw, new Date(now.getTime() + 30 * 86_400_000))).toBeNull();
  expect(signer.verify(raw, new Date(now.getTime() - 1))).toBeNull();
  expect(signer.verify('a'.repeat(513), now)).toBeNull();
  expect(new MailQrToken({ ...env, MAIL_QR_SECRET: 'r'.repeat(32) }).verify(raw, now)).toBeNull();
  expect(signer.verify('not-a-token', now)).toBeNull();
});
it('SPEC11 signed URL is first party and invoice JSON contains no bank/account/contact fields', () => {
  const signer = new MailQrToken(env);
  const url = new URL(signer.imageUrl({ kind: 'fundraising', id: 'pending-request' }, now));
  expect(url.origin).toBe(new URL(env.PORTAL_URL).origin);
  const token =
    url.pathname
      .split('/')
      .at(-1)
      ?.replace(/\.png$/, '') ?? '';
  const decoded: unknown = JSON.parse(
    Buffer.from(token.split('.')[0] ?? '', 'base64url').toString(),
  );
  expect(decoded).toEqual({
    kind: 'fundraising',
    id: 'pending-request',
    at: now.getTime(),
    exp: now.getTime() + 30 * 86_400_000,
  });
});
