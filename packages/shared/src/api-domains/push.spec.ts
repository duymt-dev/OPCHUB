import { describe, expect, it } from 'vitest';
import { pushPreferencesSchema, pushSubscribeSchema, pushLinkSchema } from './push';

describe('D-137 push input contracts', () => {
  const good = { endpoint: 'https://push.invalid/a', keys: { p256dh: 'abc_-1', auth: 'def_2' } };
  it('accepts browser subscription shape and the explicitly local test exception', () => {
    expect(pushSubscribeSchema.parse(good)).toEqual(good);
    expect(
      pushSubscribeSchema.safeParse({ ...good, endpoint: 'http://127.0.0.1:4800/device' }).success,
    ).toBe(true);
  });
  it.each([
    'http://push.invalid/a',
    'https://a:b@push.invalid/a',
    'https://push.invalid/a#key',
    'javascript:alert(1)',
  ])('rejects invalid endpoint %s', (endpoint) => {
    expect(pushSubscribeSchema.safeParse({ ...good, endpoint }).success).toBe(false);
  });
  it('rejects ownership injection, bad keys, oversized fields and incomplete preferences', () => {
    expect(pushSubscribeSchema.safeParse({ ...good, userId: 'other' }).success).toBe(false);
    expect(
      pushSubscribeSchema.safeParse({ ...good, keys: { p256dh: 'a+b=', auth: '' } }).success,
    ).toBe(false);
    expect(pushSubscribeSchema.safeParse({ ...good, userAgent: 'a'.repeat(301) }).success).toBe(
      false,
    );
    expect(pushPreferencesSchema.safeParse({ msg: true }).success).toBe(false);
    expect(
      pushPreferencesSchema.safeParse({
        msg: true,
        need: true,
        renew: true,
        event: true,
        store: false,
        zalo: true,
      }).success,
    ).toBe(false);
  });
  it('rejects encoded scheme-relative redirects', () => {
    expect(pushLinkSchema.safeParse('/%2fexample.invalid').success).toBe(false);
    expect(pushLinkSchema.safeParse('/events/a?tab=mine').success).toBe(true);
  });
});
