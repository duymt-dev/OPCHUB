import { beforeEach, describe, expect, it } from 'vitest';
import { DIRECTOR_DEMO, members, demoAccounts } from '../../../fixtures';
import { mockLogin } from '../../index';
import { buildFees } from '../admin';
import { affiliateMockState } from '../affiliate';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { auditLog } from '../audit-store';
import { mockDb, resetMockDb } from '../store';
import { readMockDirectors } from './read';
import { mockDirectorState } from './state';
import { initializeMockDirectors } from './storage';

beforeEach(() => resetMockDb());
describe('REQ-616 v4.6 default director demo', () => {
  it('has ten registered members and three real login identities, not detached labels', () => {
    expect(members).toHaveLength(10);
    expect(new Set(members.map((row) => row.id)).size).toBe(10);
    for (const row of DIRECTOR_DEMO) {
      expect(members.find((member) => member.id === row.userId)).toMatchObject({
        name: row.name,
        email: row.email,
      });
      const account = demoAccounts.find((account) => account.meId === row.userId);
      if (!account) throw new Error('Missing director login fixture');
      expect(mockLogin(row.email, account.pwd)).toMatchObject({
        ok: true,
        me: { id: row.userId, membershipFee: { status: 'regional_director' } },
      });
    }
  });

  it('BR-462 snapshots all original fee fields without inventing payments, mail or audit', () => {
    const original = buildFees();
    const config = readMockDirectors();
    expect(config.slots.map((slot) => slot.incumbent?.id)).toEqual(['m3', 'm9', 'm10']);
    for (const demo of DIRECTOR_DEMO) {
      const before = original.find((fee) => fee.userId === demo.userId);
      if (!before) throw new Error('Missing original fee');
      expect(mockDb().fees.find((fee) => fee.userId === demo.userId)).toEqual({
        ...before,
        status: 'regional_director',
      });
      expect(mockDirectorState().previousFees.find((fee) => fee.userId === demo.userId)).toEqual({
        userId: demo.userId,
        status: before.status,
        validUntil: before.validUntil,
      });
      expect(config.slots.find((slot) => slot.region === demo.region)?.bank).toEqual(demo.bank);
    }
    expect(mockDirectorState().history).toEqual([]);
    expect(mockDirectorState().mail).toEqual([]);
    expect(mockDirectorState().mailJobs).toEqual([]);
    expect(auditLog()).toEqual([]);
  });

  it('is idempotent, resets to the same demo and round-trips without mail/audit replay', () => {
    const snapshot = captureMockAffiliateSnapshot();
    initializeMockDirectors(mockDb());
    expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
    resetMockDb();
    expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
    restoreMockAffiliateSnapshot(JSON.parse(JSON.stringify(snapshot)) as unknown);
    expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
    expect(affiliateMockState().agents.get('m3')?.code).toBe('DEMOOPC12');
    expect(affiliateMockState().agents.size).toBe(10);
  });
});
