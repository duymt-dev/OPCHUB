import { beforeEach, expect, it } from 'vitest';
import { bankSettingsSchema, bankTxnPageSchema } from '../../api-domains';
import { resetMockDb, mockDb } from './store';
import {
  mockBankConfig,
  patchMockBank,
  listMockBank,
  shortMockBank,
  simulateMockBank,
  matchMockBankTxn,
  rotateMockBank,
} from './bank-reconcile';
import { auditLog } from './audit-store';
beforeEach(() => {
  resetMockDb();
});
it('REQ-621 defaults, four display states, strict compatible response and OPCHUB content', () => {
  expect(bankSettingsSchema.parse(mockBankConfig()).autoActivate).toBe(true);
  const page = bankTxnPageSchema.parse(listMockBank({ limit: 20 }));
  expect(page.items).toHaveLength(5);
  expect(new Set(page.items.map((r) => r.status)).size).toBe(4);
  expect(
    page.items
      .filter((r) => r.status !== 'unmatched')
      .every((r) => r.content.startsWith('OPCHUB ')),
  ).toBe(true);
});
it('off simulation waits, enabling does not replay; manual endpoint updates fee and status', () => {
  patchMockBank('admin', false);
  const before = mockDb().fees.find((r) => r.userId === 'm4')?.validUntil;
  const simulated = simulateMockBank('admin');
  expect(simulated.autoActivated).toBe(false);
  expect(mockDb().fees.find((r) => r.userId === 'm4')?.validUntil).toBe(before);
  patchMockBank('admin', true);
  expect(listMockBank({ limit: 20 }).items.find((r) => r.id === simulated.id)?.status).toBe(
    'unmatched',
  );
  expect(
    matchMockBankTxn('admin', simulated.id, { kind: 'fee', userId: 'm4', reason: 'Confirmed' })?.ok,
  ).toBe(true);
  expect(listMockBank({ limit: 20 }).items.find((r) => r.id === simulated.id)?.status).toBe(
    'manual',
  );
});
it('short record never activates, conflict on repeat, rotation persists only hint and audit', () => {
  const before = mockDb().fees.map((f) => f.validUntil);
  expect(mockBankConfig().counts.pending).toBe(2);
  expect(shortMockBank('admin', 'bank-demo-5', 'Awaiting top up')).toBe(true);
  expect(shortMockBank('admin', 'bank-demo-5', 'Again')).toBe(false);
  expect(mockBankConfig().counts.pending).toBe(1);
  expect(mockDb().fees.map((f) => f.validUntil)).toEqual(before);
  const rotated = rotateMockBank('admin');
  expect(mockBankConfig().keyHint).toBe(rotated.hint);
  expect(JSON.stringify(mockBankConfig()) + JSON.stringify(auditLog())).not.toContain(rotated.key);
});
