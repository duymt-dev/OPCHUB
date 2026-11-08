import { beforeEach, expect, it } from 'vitest';
import { resetMockDb } from './store';
import {
  mockRegionalAppoint,
  mockRegionalPatch,
  mockRegionalRevoke,
  mockRegionalDirectors,
} from './regional-directors';
import { mockRegionalPayeeBank } from './regional-payee-bank';
import { regionalMockBanks } from './regional-share-bank';
import { auditLog } from './audit-store';

beforeEach(resetMockDb);
it('SPEC1/4 MSW never inherits a retired bank, preserves it and accepts only related retired payees', () => {
  const bank = { bankName: 'Fixture Bank', bankNo: '123456789', bankHolder: 'OLD DIRECTOR' };
  expect(mockRegionalAppoint('south', 'm5', 'Admin').ok).toBe(true);
  expect(mockRegionalPatch('south', { bank }).ok).toBe(true);
  expect(mockRegionalRevoke('south', 'Admin').ok).toBe(true);
  expect(regionalMockBanks().get('south:m5')).toEqual(bank);
  expect(mockRegionalDirectors(false).items.find((s) => s.region === 'south')?.bank.bankNo).toBe(
    '',
  );
  const updated = { ...bank, bankNo: '987654321' };
  expect(mockRegionalPayeeBank('south', 'm5', updated).ok).toBe(true);
  expect(regionalMockBanks().get('south:m5')).toEqual(updated);
  expect(
    JSON.stringify(auditLog().find((e) => e.action === 'regional_director.payee_bank')),
  ).not.toContain(updated.bankNo);
  expect(mockRegionalPayeeBank('north', 'unknown-user', updated).ok).toBe(false);
  expect(mockRegionalAppoint('south', 'm5', 'Admin').ok).toBe(true);
  expect(mockRegionalDirectors(false).items.find((s) => s.region === 'south')?.bank.bankNo).toBe(
    '',
  );
  expect(mockRegionalPayeeBank('south', 'm5', updated).ok).toBe(false);
});
