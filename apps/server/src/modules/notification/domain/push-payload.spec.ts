import { describe, expect, it } from 'vitest';
import { pushPayload } from './push-payload';

describe('D-137 push payload privacy', () => {
  it('redacts phone email account and money before truncating to the encrypted budget', () => {
    const payload = pushPayload({
      id: 'notification-1',
      title: 'x'.repeat(80),
      body: '0912 345 678 a@x.vn 1203132809 1.200.000đ 2.000 VND ' + 'y'.repeat(200),
      link: '/chat/group-1',
    });
    expect(payload.title).toHaveLength(60);
    expect(payload.body).toHaveLength(120);
    expect(payload.body).toContain('[SĐT] [email] [STK] [số tiền] [số tiền]');
    expect(payload.tag).toBe('notification-1');
    expect(Buffer.byteLength(JSON.stringify(payload)) + 103).toBeLessThan(3072);
  });
  it.each([
    'https://evil.invalid',
    '//evil.invalid',
    '/%2fevil.invalid',
    '/\\evil.invalid',
    '/%5cevil.invalid',
    '/%0aevil',
    '/%ZZ',
  ])('rejects unsafe click target %s', (link) => {
    expect(pushPayload({ id: 'n', title: 'T', body: '', link }).link).toBe('/dashboard');
  });
  it('retains safe same-origin application paths', () => {
    expect(pushPayload({ id: 'n', title: 'T', body: '', link: '/events/one?tab=mine' }).link).toBe(
      '/events/one?tab=mine',
    );
  });
});
