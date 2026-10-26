import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { RegisterBusinessRequest, RegisterPersonalRequest } from '../../../api';
import { mockDb, resetMockDb } from '../store';
import { listAdminMembers } from '../admin-members';
import { listMailLog } from '../marketing';
import {
  captureCommunitySnapshot,
  restoreCommunitySnapshot,
} from '../community-persistence/snapshot';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import {
  activateMockRegistration,
  beginMockRegistration,
  pendingMockRegistration,
  resendMockRegistration,
} from './commands';
import { registrationMailLog } from './mail';
import { captureRegistrationSnapshot } from './snapshot';

const NOW = Date.parse('2026-10-21T05:00:00Z');
const secret = 'SyntheticPasswordNeverInTheSnapshot42!';
const personal = (): RegisterPersonalRequest => ({
  email: 'created@example.test',
  fullName: 'New Personal Member',
  password: secret,
  phone: { country: 'vn', number: '0912345678' },
  persona: 'expert',
  groupIds: ['c1', 'c2'],
  agreeTerms: true,
});
const business = (): RegisterBusinessRequest => ({
  email: 'company@example.test',
  representative: 'New Representative',
  password: secret,
  phone: { country: 'vn', number: '0912345678' },
  groupIds: ['c2'],
  agreeTerms: true,
  taxCode: '0101234567',
  companyName: 'Công ty TNHH Giải pháp MediaSoft',
  mainIndustry: '6201',
  otherIndustries: ['6202', '6311'],
  size: '1-10',
  country: 'vn',
  position: 'Owner',
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  resetMockDb();
});
afterEach(() => vi.useRealTimers());

describe('UAT-02/04 REQ-401 P5-MSW-REGISTRATION-01 actual registration records', () => {
  it('queues its own OTP then delivers once; read does not fabricate an unrelated recipient', () => {
    beginMockRegistration('personal', personal(), NOW);
    expect(registrationMailLog(NOW)).toMatchObject([
      { kind: 'otp', to: personal().email, status: 'queued', attempts: 0 },
    ]);
    vi.setSystemTime(NOW + 2);
    const own = listMailLog().filter((row) => row.to === personal().email);
    expect(own).toMatchObject([{ kind: 'otp', status: 'sent', attempts: 1 }]);
    expect(listMailLog().filter((row) => row.to === personal().email)).toEqual(own);
    expect(listAdminMembers(undefined, personal().email).items).toEqual([]);
  });

  it('activates exactly one real profile, pending fee, welcome and group admission', () => {
    const base = mockDb().groups.find((group) => group.id === 'c2')?.memberCount;
    beginMockRegistration('personal', personal(), NOW);
    const me = activateMockRegistration(personal().email, NOW);
    expect(me).toMatchObject({
      email: personal().email,
      status: 'active',
      membershipFee: { status: 'pending_payment' },
    });
    expect(activateMockRegistration(personal().email, NOW)).toBeUndefined();
    const result = listAdminMembers('personal', personal().email);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      fullName: personal().fullName,
      phone: '+84 912 345 678',
      persona: 'Chuyên gia',
      // D-71: mọi nhóm đã chọn vào ngay (c1 trước đây cần duyệt)
      groupIds: ['c1', 'c2'],
      status: 'active',
    });
    expect(mockDb().fees.filter((fee) => fee.userId === me?.id)).toHaveLength(1);
    expect(captureRegistrationSnapshot().mail.filter((row) => row.kind === 'welcome')).toHaveLength(
      1,
    );
    expect(mockDb().groups.find((group) => group.id === 'c2')?.memberCount).toBe((base ?? 0) + 1);
    expect(
      mockDb()
        .groupMembers.get(me?.id ?? '')
        ?.get('c2'),
    ).toBe('member');
  });

  it('retains business profile and other public submitted fields, never credentials', () => {
    beginMockRegistration('business', business(), NOW);
    expect(JSON.stringify(captureCommunitySnapshot())).not.toContain(secret);
    activateMockRegistration(business().email, NOW);
    expect(listAdminMembers('business', business().email).items[0]).toMatchObject({
      fullName: business().representative,
      organization: business().companyName,
      business: {
        taxCode: business().taxCode,
        field: '6201',
        position: 'Owner',
        verification: 'verified',
      },
    });
    const saved = captureRegistrationSnapshot();
    expect(saved.metadata[0]?.[1]).toMatchObject({
      accountType: 'business',
      input: { otherIndustries: ['6202', '6311'] },
    });
    expect(JSON.stringify(saved)).not.toContain(secret);
    expect(JSON.stringify(saved)).not.toContain('"password"');
    expect(JSON.stringify(saved)).not.toContain('"passwordHash"');
  });

  it('expires pending activation, refreshes a live resend, and consumes activation once', () => {
    expect(activateMockRegistration('unknown@example.test', NOW)).toBeUndefined();
    beginMockRegistration('personal', personal(), NOW);
    expect(resendMockRegistration(personal().email, NOW + 599999)).toBe(true);
    expect(pendingMockRegistration(personal().email, NOW + 600001)).toBeDefined();
    expect(activateMockRegistration(personal().email, NOW + 1199999)).toBeUndefined();
    expect(resendMockRegistration(personal().email, NOW + 1199999)).toBe(true);
    expect(resendMockRegistration(personal().email, NOW + 1800000)).toBe(false);
    expect(activateMockRegistration(personal().email, NOW + 1800000)).toBeUndefined();
    expect(listAdminMembers(undefined, personal().email).items).toEqual([]);
  });

  it('UAT-03 permits a fresh OTP after ten minutes but never extends the thirty-minute pending record', () => {
    beginMockRegistration('personal', personal(), NOW);
    expect(activateMockRegistration(personal().email, NOW + 600000)).toBeUndefined();
    expect(resendMockRegistration(personal().email, NOW + 600001)).toBe(true);
    expect(activateMockRegistration(personal().email, NOW + 600002)).toBeDefined();
    beginMockRegistration('business', business(), NOW);
    expect(resendMockRegistration(business().email, NOW + 1799999)).toBe(true);
    expect(activateMockRegistration(business().email, NOW + 1800000)).toBeUndefined();
  });

  it('restores a fresh runtime, profile/mail/fees and admissions without count drift or duplicate delivery', () => {
    beginMockRegistration('personal', personal(), NOW);
    activateMockRegistration(personal().email, NOW);
    vi.setSystemTime(NOW + 2);
    listMailLog();
    const community = captureCommunitySnapshot();
    const financial = captureMockAffiliateSnapshot();
    const count = mockDb().groups.find((group) => group.id === 'c2')?.memberCount;
    resetMockDb();
    restoreMockAffiliateSnapshot(financial);
    restoreCommunitySnapshot(community);
    restoreCommunitySnapshot(community);
    expect(listAdminMembers(undefined, personal().email).items).toHaveLength(1);
    expect(listMailLog().filter((row) => row.to === personal().email)).toHaveLength(2);
    expect(mockDb().fees.filter((fee) => fee.email === personal().email)).toHaveLength(1);
    expect(mockDb().groups.find((group) => group.id === 'c2')?.memberCount).toBe(count);
    expect(captureCommunitySnapshot()).toEqual(community);
  });

  it('rejects injected credentials or seeded-user replacement before changing other domains', () => {
    beginMockRegistration('personal', personal(), NOW);
    activateMockRegistration(personal().email, NOW);
    const before = captureCommunitySnapshot();
    const row = before.registration?.profiles[0];
    if (!row) throw new Error('Missing profile control');
    for (const profile of [
      { ...row, password: secret },
      { ...row, id: 'm1' },
    ]) {
      expect(() =>
        restoreCommunitySnapshot({
          ...before,
          bot: { ...before.bot, settings: { ...before.bot.settings, enabled: false } },
          registration: { ...before.registration, profiles: [profile] },
        }),
      ).toThrow();
      expect(captureCommunitySnapshot()).toEqual(before);
    }
  });

  it('reads a legacy composition without registration state and keeps original seed identities', () => {
    const legacy = captureCommunitySnapshot();
    delete legacy.registration;
    beginMockRegistration('personal', personal(), NOW);
    activateMockRegistration(personal().email, NOW);
    restoreCommunitySnapshot(legacy);
    expect(listAdminMembers(undefined, personal().email).items).toEqual([]);
    expect(listAdminMembers(undefined, undefined).counts.all).toBe(8);
  });
});
