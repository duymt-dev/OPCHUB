import { expect, it } from 'vitest';
import { redactMailQrRequest } from './redact-mail-qr';

it('SPEC11 signed image credentials/query never enter access logs; unrelated routes remain unchanged', () => {
  const req = {
    id: 'request-id',
    method: 'GET',
    url: '/v1/public/mail-qr/secret.signature.png?raw=private',
    headers: { cookie: 'kept-for-existing-redactor' },
  };
  expect(redactMailQrRequest(req)).toEqual({ ...req, url: '/v1/public/mail-qr/[Redacted].png' });
  expect(redactMailQrRequest(req)).not.toBe(req);
  const plain = { url: '/v1/public/health' };
  expect(redactMailQrRequest(plain)).toBe(plain);
});
