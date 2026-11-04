import { beforeEach, describe, expect, it } from 'vitest';
import { activateMockRegistration, beginMockRegistration } from './registration/commands';
import { regionalBankSchema } from '../../api-domains';
import {
  mockRegionalAppoint,
  mockRegionalCandidates,
  mockRegionalDirectors,
  mockRegionalPatch,
  mockRegionalRevoke,
} from './regional-directors';
import { mockDb, resetMockDb } from './store';

describe('TIP-V46-801 regional mock parity', () => {
  beforeEach(resetMockDb);
  it('newly activated members are searchable and appointable, not only fixture IDs', () => {
    const now = Date.parse('2026-10-16T02:00:00Z');
    const email = 'new.regional@example.test';
    beginMockRegistration(
      'personal',
      {
        email,
        fullName: 'New Regional Member',
        password: 'SyntheticMember2026!',
        phone: { country: 'vn', number: '0912345678' },
        persona: 'expert',
        groupIds: ['c1'],
        agreeTerms: true,
      },
      now,
    );
    const user = activateMockRegistration(email, now);
    if (!user) throw new Error('Registration fixture failed');
    expect(mockRegionalCandidates('south', email).items.map((m) => m.id)).toEqual([user.id]);
    expect(mockRegionalAppoint('south', user.id, 'Super Admin', now).ok).toBe(true);
    expect(mockRegionalDirectors(true).items.find((s) => s.region === 'south')?.member?.id).toBe(
      user.id,
    );
  });
  it('has three demo directors and 34 selected provinces', () => {
    const state = mockRegionalDirectors(true);
    expect(state.items.map((s) => s.member?.id)).toEqual(['m3', 'm9', 'm10']);
    expect(state.unassignedProvinces).toBe(0);
    expect(mockDb().fees.filter((f) => f.status === 'regional_director')).toHaveLength(3);
  });
  it('AT-GDV05 excludes another region and refuses direct assignment', () => {
    expect(mockRegionalCandidates('south', 'bao.tran').items).toEqual([]);
    expect(mockRegionalAppoint('south', 'm3', 'Admin')).toMatchObject({ ok: false, status: 409 });
  });
  it('AT-GDV06 locked user rejected', () => {
    mockDb().userStatus.set('m1', 'locked');
    expect(mockRegionalAppoint('south', 'm1', 'Admin')).toMatchObject({ ok: false, status: 422 });
  });
  it('AT-GDV07 replacing records revoke/appoint; revocation restores trial', () => {
    expect(mockRegionalAppoint('south', 'm5', 'Admin').ok).toBe(true);
    expect(mockRegionalDirectors(true).history.map((e) => e.action)).toEqual(['appoint', 'revoke']);
    expect(mockRegionalRevoke('south', 'Admin').ok).toBe(true);
    expect(mockDb().fees.find((f) => f.userId === 'm5')?.status).not.toBe('regional_director');
    expect(mockRegionalRevoke('south', 'Admin')).toMatchObject({ ok: false, status: 409 });
  });
  it('province coverage does not control affiliate counts', () => {
    const before = mockRegionalDirectors(true).items[0]?.affiliateCount;
    expect(mockRegionalPatch('north', { provinces: [] }).ok).toBe(true);
    expect(mockRegionalDirectors(true).items[0]?.affiliateCount).toBe(before);
    expect(mockRegionalPatch('south', { provinces: ['Hà Nội'] })).toMatchObject({
      ok: false,
      status: 422,
    });
  });
  it('bank number accepts spaces; holder normalized; other symbols rejected', () => {
    expect(
      regionalBankSchema.parse({
        bankName: 'VCB',
        bankNo: '0011 00100 4567',
        bankHolder: 'Phạm Thu Hà',
      }).bankHolder,
    ).toBe('PHAM THU HA');
    expect(
      regionalBankSchema.safeParse({ bankName: 'VCB', bankNo: '123-456', bankHolder: 'A' }).success,
    ).toBe(false);
  });
});
