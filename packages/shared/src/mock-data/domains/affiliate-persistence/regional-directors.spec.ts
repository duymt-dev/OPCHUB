import { beforeEach, describe, expect, it } from 'vitest';
import { provinces } from '../../../fixtures';
import { auditLog, recordAudit } from '../audit-store';
import { mockDirectorState } from '../regional-directors/state';
import { mockDb, resetMockDb } from '../store';
import { captureMockAffiliateSnapshot, restoreMockAffiliateSnapshot } from './snapshot';

beforeEach(() => resetMockDb());

/** Construct committed state directly; these are persistence tests, not command/HTTP proof. */
function appointedSnapshot() {
  const data = captureMockAffiliateSnapshot();
  const fee = data.fees.find((row) => row.userId === 'm3');
  const state = data.directors;
  const slot = state?.config.slots.find((row) => row.region === 'north');
  if (!fee || !state || !slot || fee.status === 'regional_director')
    throw new Error('Expected base member and three empty director slots');
  state.previousFees.push({
    userId: fee.userId,
    status: fee.status,
    validUntil: fee.validUntil,
  });
  fee.status = 'regional_director';
  slot.version = 2;
  slot.bank = { bankName: 'Vietcombank', bankNo: '001100104567', bankHolder: 'TRAN QUOC BAO' };
  slot.incumbent = {
    id: fee.userId,
    memberCode: fee.memberCode,
    fullName: fee.fullName,
    email: fee.email,
    appointedAt: '2026-10-30T03:00:00.000Z',
  };
  state.history.push({
    id: '019a3310-0000-7000-8000-000000000001',
    region: 'north',
    action: 'appointed',
    memberName: fee.fullName,
    actorName: 'Quản trị hệ thống',
    actorRole: 'Super Admin',
    at: slot.incumbent.appointedAt,
    summary: 'Bổ nhiệm GĐ Vùng Miền Bắc',
  });
  state.mail.push({
    id: 'director-mail-1',
    kind: 'director_appointed',
    to: fee.email,
    name: fee.fullName,
    subject: 'Bổ nhiệm GĐ Vùng',
    sentAt: '2026-10-30T03:00:00.000Z',
    status: 'queued',
    attempts: 0,
    error: null,
  });
  state.mailJobs.push({ id: 'director-mail-1', dueAt: '2026-10-30T03:00:01.000Z' });
  return data;
}

describe('REQ-616 director persistence bridge', () => {
  it('starts with three permanent slots and the complete default province partition', () => {
    const state = mockDirectorState();
    expect(state.config.slots.map((slot) => slot.region)).toEqual(['north', 'central', 'south']);
    expect(state.config.unassignedProvinces).toEqual([]);
    expect(state.config.slots.every((slot) => slot.provinces.length > 0)).toBe(true);
    expect(state.config.slots.flatMap((slot) => slot.provinces).sort()).toEqual(
      provinces.map(([name]) => name).sort(),
    );
  });

  it('BR-462 retains the original fee and queued mail across a JSON reload without replay', () => {
    const data = appointedSnapshot();
    const original = data.directors?.previousFees;
    resetMockDb();
    restoreMockAffiliateSnapshot(JSON.parse(JSON.stringify(data)) as unknown);
    restoreMockAffiliateSnapshot(data);
    expect(captureMockAffiliateSnapshot()).toEqual(data);
    expect(mockDirectorState().previousFees).toEqual(original);
    expect(mockDirectorState().mail).toHaveLength(1);
    expect(mockDirectorState().mail[0]?.attempts).toBe(0);
    expect(mockDirectorState().mailJobs).toHaveLength(1);
    expect(auditLog()).toEqual([]);
  });

  it('AT-GDV07 preserves the native audit prefix and diff, replacing rather than duplicating', () => {
    recordAudit('admin', 'regional_director.appointed', 'north', 'Bổ nhiệm', { memberId: 'm3' });
    const data = captureMockAffiliateSnapshot();
    resetMockDb();
    recordAudit('admin', 'group.update', 'g1');
    restoreMockAffiliateSnapshot(data);
    restoreMockAffiliateSnapshot(data);
    expect(auditLog().filter((row) => row.action === 'regional_director.appointed')).toEqual(
      data.audit,
    );
    expect(data.audit[0]?.diff).toEqual({ memberId: 'm3' });
    expect(auditLog().filter((row) => row.action === 'group.update')).toHaveLength(1);
  });

  it('accepts a legacy ledger with no exemption and resets stale director state', () => {
    const legacy = captureMockAffiliateSnapshot();
    delete legacy.directors;
    restoreMockAffiliateSnapshot(appointedSnapshot());
    restoreMockAffiliateSnapshot(legacy);
    expect(mockDirectorState().previousFees).toEqual([]);
    expect(mockDirectorState().mail).toEqual([]);
    expect(mockDb().fees.some((fee) => fee.status === 'regional_director')).toBe(false);
  });

  it.each([
    'legacy-exempt',
    'missing-original',
    'changed-deadline',
    'duplicate-original',
    'missing-fee',
    'nonexempt-incumbent',
    'unknown-province',
    'missing-province',
    'orphan-mail-job',
    'missing-mail-job',
    'duplicate-mail',
    'duplicate-job',
  ])('rejects %s before changing any live data', (kind) => {
    const data = appointedSnapshot();
    const state = data.directors;
    const fee = data.fees.find((row) => row.userId === 'm3');
    const previous = state?.previousFees[0];
    const slot = state?.config.slots[0];
    const mail = state?.mail[0];
    const job = state?.mailJobs[0];
    if (!state || !fee || !previous || !slot || !mail || !job) throw new Error('Fixture missing');
    if (kind === 'missing-original') state.previousFees = [];
    if (kind === 'changed-deadline') previous.validUntil = '2027-01-01T00:00:00.000Z';
    if (kind === 'duplicate-original') state.previousFees.push(previous);
    if (kind === 'missing-fee') data.fees = data.fees.filter((row) => row.userId !== 'm3');
    if (kind === 'nonexempt-incumbent') fee.status = 'active';
    if (kind === 'unknown-province') slot.provinces[0] = 'Unknown';
    if (kind === 'missing-province') slot.provinces.pop();
    if (kind === 'orphan-mail-job') job.id = 'unknown';
    if (kind === 'missing-mail-job') state.mailJobs = [];
    if (kind === 'duplicate-mail') state.mail.push(mail);
    if (kind === 'duplicate-job') state.mailJobs.push(job);
    const legacy = { ...data };
    delete legacy.directors;
    const before = captureMockAffiliateSnapshot();
    expect(() => restoreMockAffiliateSnapshot(kind === 'legacy-exempt' ? legacy : data)).toThrow();
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it('clones nested incoming and captured state and resets with MockDb identity', () => {
    const data = appointedSnapshot();
    restoreMockAffiliateSnapshot(data);
    const before = captureMockAffiliateSnapshot();
    data.directors?.previousFees.splice(0);
    data.directors?.mail.splice(0);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
    const captured = captureMockAffiliateSnapshot();
    captured.directors?.mailJobs.splice(0);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
    resetMockDb();
    expect(mockDirectorState().previousFees).toEqual([]);
    expect(mockDirectorState().config.slots.every((slot) => !slot.incumbent)).toBe(true);
  });
});
