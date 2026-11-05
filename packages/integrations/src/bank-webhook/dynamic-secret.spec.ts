import { describe, expect, it } from 'vitest';
import { FakeBankProvider } from './fake.provider';
import { SepayBankProvider } from './sepay.provider';
import { signBody } from './signature';
describe('TIP806 runtime webhook credentials', () => {
  it('fake uses explicit current secret, retaining env-compatible default', () => {
    const bank = new FakeBankProvider('old-env-secret-123');
    const body = { id: 'new', amount: 1, content: 'OPCHUB' };
    const old = bank.sign(body),
      fresh = bank.sign(body, 'new-rotated-secret-123');
    expect(bank.verify(Buffer.from(old.rawBody), old.headers)).toBe(true);
    expect(bank.verify(Buffer.from(old.rawBody), old.headers, 'new-rotated-secret-123')).toBe(
      false,
    );
    expect(bank.verify(Buffer.from(fresh.rawBody), fresh.headers, 'new-rotated-secret-123')).toBe(
      true,
    );
  });
  it('SePay override verifies HMAC without making external requests', () => {
    const bank = new SepayBankProvider({
      webhookSecret: 'old',
      apiToken: 'unused',
      accountNumber: 'test',
    });
    const raw = Buffer.from('{}'),
      headers = { 'x-sepay-signature': signBody('new', raw) };
    expect(bank.verify(raw, headers)).toBe(false);
    expect(bank.verify(raw, headers, 'new')).toBe(true);
  });
});
