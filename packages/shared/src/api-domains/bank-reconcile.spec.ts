import { describe, expect, it } from 'vitest';
import {
  bankSettingsPatchSchema,
  bankShortSchema,
  bankTxnQuerySchema,
  bankKeyRotateResultSchema,
  bankTxnRowSchema,
} from './bank-reconcile';
describe('REQ-621 strict bank schemas', () => {
  it('accepts only boolean autoActivate, not provider, key or unknown fields', () => {
    expect(bankSettingsPatchSchema.parse({ autoActivate: false })).toEqual({ autoActivate: false });
    for (const input of [
      { autoActivate: 'false' },
      { autoActivate: true, provider: 'sepay' },
      { autoActivate: true, key: 'secret' },
      {},
    ]) {
      expect(bankSettingsPatchSchema.safeParse(input).success).toBe(false);
    }
  });
  it('validates trimmed required note1..500 and strict request', () => {
    expect(bankShortSchema.parse({ note: ' note ' })).toEqual({ note: 'note' });
    for (const note of ['', '  ', 'x'.repeat(501)])
      expect(bankShortSchema.safeParse({ note }).success).toBe(false);
    expect(bankShortSchema.safeParse({ note: 'ok', activate: true }).success).toBe(false);
  });
  it('parses stable timestamp/id cursor and bounded20..50 pagination', () => {
    expect(bankTxnQuerySchema.parse({}).limit).toBe(20);
    expect(
      bankTxnQuerySchema.parse({
        cursor: JSON.stringify({ id: 'x', receivedAt: '2026-11-05T00:00:00Z' }),
      }).cursor?.id,
    ).toBe('x');
    for (const input of [{ cursor: 'bad' }, { cursor: '{}' }, { limit: '51' }, { limit: '0' }])
      expect(bankTxnQuerySchema.safeParse(input).success).toBe(false);
  });
  it('rotate response cannot be used as a transaction response', () => {
    expect(bankKeyRotateResultSchema.safeParse({ key: 'k'.repeat(43), hint: 'kkkk' }).success).toBe(
      true,
    );
    expect(bankTxnRowSchema.safeParse({ key: 'k'.repeat(43) }).success).toBe(false);
  });
});
