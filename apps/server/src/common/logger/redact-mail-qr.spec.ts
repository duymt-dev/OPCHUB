import { expect, it } from 'vitest';
import { redactMailQrPath, redactMailQrRequest } from './redact-mail-qr';

it('SPEC11 signed image credentials/query never enter access logs; unrelated routes remain unchanged', () => {
  const req = {
    id: 'request-id',
    method: 'GET',
    url: '/v1/public/mail-qr/secret.signature.png?raw=private',
    originalUrl: '/v1/public/mail-qr/secret.signature.png?raw=private',
    params: { splat: ['public', 'mail-qr', 'secret.signature.png'], token: 'secret.signature' },
    query: { raw: 'private' },
    headers: { cookie: 'kept-for-existing-redactor' },
  };
  expect(redactMailQrRequest(req)).toEqual({
    ...req,
    url: '/v1/public/mail-qr/[Redacted].png',
    originalUrl: '/v1/public/mail-qr/[Redacted].png',
    params: '[Redacted]',
    query: '[Redacted]',
  });
  expect(JSON.stringify(redactMailQrRequest(req))).not.toMatch(/secret\.signature|raw=private/);
  expect(redactMailQrRequest(req)).not.toBe(req);
  const plain = { url: '/v1/public/health' };
  expect(redactMailQrRequest(plain)).toBe(plain);
});

it('SPEC11 masks case-insensitive Express routes and error-filter paths', () => {
  expect(redactMailQrPath('/v1/PUBLIC/mail-qr/bearer.signature.png')).toBe(
    '/v1/PUBLIC/mail-qr/[Redacted].png',
  );
  expect(redactMailQrPath('/v1/health')).toBe('/v1/health');
});
