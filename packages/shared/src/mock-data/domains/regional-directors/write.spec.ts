import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MEMBERSHIP_FEE_STATUS } from '../../../enums';
import { directorConfigSchema } from '../../../api-domains';
import { isFeeUsable } from '../../../membership/fee-access';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { auditLog } from '../audit-store';
import { listMailLog } from '../marketing';
import { listSettingsLog } from '../settings-log';
import { mockDb, resetMockDb } from '../store';
import { DAY_MS } from '../util';
import { mockDirectorMailLog } from './effects';
import { readMockDirectors } from './read';
import { mockDirectorState } from './state';
import { appointMockDirector, configureMockDirector, revokeMockDirector } from './write';
import { arrangeEmptyDirectors } from './empty.fixture';

const NOW = Date.parse('2026-10-30T03:00:00.000Z');
const bank = { bankName: 'Vietcombank', bankNo: '001100104567', bankHolder: 'TRAN QUOC BAO' };
const appoint = (userId = 'm3', region = 'north', version = 1) =>
  appointMockDirector('admin', { region, userId, version });
function feeOf(id = 'm3') {
  const fee = mockDb().fees.find((row) => row.userId === id);
  if (!fee) throw new Error('Missing fee fixture');
  return fee;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetMockDb();
  arrangeEmptyDirectors();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('REQ-616 MSW domain commands (not native or browser proof)', () => {
  it.each(MEMBERSHIP_FEE_STATUS.filter((status) => status !== 'regional_director'))(
    'AT-GDV01 appoints from %s without changing payment fields or deadline',
    (status) => {
      const fee = feeOf();
      fee.status = status;
      const original = structuredClone(fee);
      const result = appoint();
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Appointment rejected');
      expect(directorConfigSchema.parse(result.data).slots[0]).toMatchObject({
        version: 2,
        incumbent: { id: 'm3', appointedAt: new Date(NOW).toISOString() },
      });
      expect(feeOf()).toEqual({ ...original, status: 'regional_director' });
      expect(isFeeUsable(feeOf(), new Date(NOW))).toBe(true);
      expect(mockDirectorState().previousFees).toEqual([
        { userId: 'm3', status, validUntil: original.validUntil },
      ]);
      expect(mockDirectorState().mail).toHaveLength(1);
      expect(auditLog()).toHaveLength(1);
    },
  );

  it.each([
    ['trial', 5, 'trial'],
    ['active', 31, 'active'],
    ['active', 30, 'expiring'],
    ['expiring', 1, 'expiring'],
    ['active', 0, 'pending_payment'],
    ['trial', -1, 'pending_payment'],
    ['expired', 5, 'pending_payment'],
    ['pending_payment', 5, 'pending_payment'],
    ['active', null, 'pending_payment'],
  ] as const)(
    'BR-462 restores %s with %s days remaining after a JSON reload to %s',
    (status, days, expected) => {
      const fee = feeOf();
      fee.status = status;
      fee.validUntil = days === null ? null : new Date(NOW + days * DAY_MS).toISOString();
      const original = structuredClone(fee);
      expect(appoint().ok).toBe(true);
      const snapshot: unknown = JSON.parse(JSON.stringify(captureMockAffiliateSnapshot()));
      resetMockDb();
      restoreMockAffiliateSnapshot(snapshot);
      expect(revokeMockDirector('admin', 'north', { version: 2 }).ok).toBe(true);
      expect(feeOf()).toEqual({ ...original, status: expected });
      expect(mockDirectorState().previousFees).toEqual([]);
      expect(readMockDirectors().slots[0]?.incumbent).toBeNull();
      expect(mockDirectorState().mail.map((row) => row.kind)).toEqual([
        'director_revoked',
        'director_appointed',
      ]);
    },
  );

  it('BR-462 time in office does not extend a trial and a second appointment snapshots restored fees', () => {
    feeOf().status = 'trial';
    feeOf().validUntil = new Date(NOW + DAY_MS).toISOString();
    expect(appoint().ok).toBe(true);
    vi.setSystemTime(NOW + 2 * DAY_MS);
    expect(revokeMockDirector('admin', 'north', { version: 2 }).ok).toBe(true);
    expect(feeOf().status).toBe('pending_payment');
    expect(appoint('m3', 'north', 3).ok).toBe(true);
    expect(mockDirectorState().previousFees[0]?.status).toBe('pending_payment');
  });

  it('AT-GDV05 rejects occupied slots, duplicate people and stale versions without side effects', () => {
    expect(appoint().ok).toBe(true);
    const before = captureMockAffiliateSnapshot();
    expect(appoint('m1', 'north', 2)).toMatchObject({ ok: false, status: 409 });
    expect(appoint('m3', 'south', 1)).toMatchObject({ ok: false, status: 409 });
    expect(revokeMockDirector('admin', 'north', { version: 1 })).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it('AT-GDV06 rechecks member locks; fee rows alone are not registered member identities', () => {
    mockDb().fees.push({ ...feeOf(), userId: 'fee-only-member' });
    const before = captureMockAffiliateSnapshot();
    mockDb().userStatus.set('m3', 'locked');
    expect(appoint()).toMatchObject({ ok: false, status: 409 });
    expect(appoint('unknown')).toMatchObject({ ok: false, status: 404 });
    expect(appoint('fee-only-member')).toMatchObject({ ok: false, status: 404 });
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it('AT-GDV03 rejects every direct write by a view-only accountant', () => {
    const before = captureMockAffiliateSnapshot();
    expect(
      appointMockDirector('adm-mai', { region: 'north', userId: 'm3', version: 1 }),
    ).toMatchObject({ status: 403 });
    expect(
      configureMockDirector('adm-mai', 'north', { version: 1, provinces: [], bank: null }),
    ).toMatchObject({ status: 403 });
    expect(revokeMockDirector('adm-mai', 'north', { version: 1 })).toMatchObject({ status: 403 });
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it('REQ-616 validates province ownership, catalog and bank before changing configuration', () => {
    const before = captureMockAffiliateSnapshot();
    const foreign = before.directors?.config.slots.find((slot) => slot.region === 'south')
      ?.provinces[0];
    if (!foreign) throw new Error('Missing south province');
    expect(
      configureMockDirector('admin', 'north', { version: 1, provinces: [foreign], bank }),
    ).toMatchObject({ status: 409 });
    expect(
      configureMockDirector('admin', 'north', { version: 1, provinces: ['unknown'], bank }),
    ).toMatchObject({ status: 400, fields: [{ path: 'provinces' }] });
    expect(
      configureMockDirector('admin', 'north', {
        version: 1,
        provinces: [],
        bank: { bankName: 'VCB' },
      }),
    ).toMatchObject({ status: 400 });
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it('REQ-616 revoke retains permanent slots/provinces, not an unowned bank; configuring sends no mail', () => {
    expect(
      configureMockDirector('admin', 'north', { version: 1, provinces: ['Hà Nội'], bank }).ok,
    ).toBe(true);
    expect(mockDirectorState().mail).toEqual([]);
    expect(appoint('m3', 'north', 2).ok).toBe(true);
    expect(readMockDirectors().slots[0]?.bank).toBeNull();
    expect(revokeMockDirector('admin', 'north', { version: 3 }).ok).toBe(true);
    expect(readMockDirectors().slots).toHaveLength(3);
    expect(readMockDirectors().slots[0]).toMatchObject({
      version: 4,
      provinces: ['Hà Nội'],
      bank: null,
      incumbent: null,
    });
    expect(revokeMockDirector('admin', 'north', { version: 4 })).toMatchObject({ status: 409 });
  });

  it('AT-GDV07 records real actor name/role and native action prefix; BR-464 delivers each fake job once', () => {
    expect(appointMockDirector('adm-trang', { region: 'north', userId: 'm3', version: 1 }).ok).toBe(
      true,
    );
    expect(mockDirectorState().history[0]).toMatchObject({
      actorName: 'Phạm Thu Trang',
      actorRole: 'Quản trị viên',
      action: 'appointed',
    });
    expect(listSettingsLog()[0]?.actorName).toBe('Phạm Thu Trang');
    expect(auditLog()[0]).toMatchObject({
      action: 'regional_director.appointed',
      diff: { region: 'north', memberId: 'm3' },
    });
    expect(mockDirectorMailLog(NOW)[0]?.status).toBe('queued');
    expect(mockDirectorMailLog(NOW + 1)[0]).toMatchObject({ status: 'sent', attempts: 1 });
    expect(mockDirectorMailLog(NOW + 100)[0]?.attempts).toBe(1);
    expect(listMailLog().filter((row) => row.kind === 'director_appointed')).toHaveLength(1);
    expect(mockDirectorState().mailJobs).toEqual([]);
  });

  it('REQ-616 rolls back an exception after fee mutation instead of retaining half an appointment', () => {
    const before = captureMockAffiliateSnapshot();
    vi.spyOn(crypto, 'randomUUID').mockImplementationOnce(() => {
      throw new Error('Injected history storage failure');
    });
    expect(() => appoint()).toThrow('Injected history storage failure');
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });
});
